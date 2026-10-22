import { LiveDetectedQuestion } from "@/types";

// Common question indicators in English
const ENGLISH_QUESTION_STARTERS = [
  "what", "why", "how", "when", "where", "who", "which",
  "can you", "could you", "would you", "will you",
  "tell me", "explain", "describe", "walk me through",
  "have you used", "have you worked", "do you know", "is it possible",
  "what is the difference", "how would you", "how do you"
];

// Common question indicators in Malayalam / Manglish
const MALAYALAM_QUESTION_MARKERS = [
  "എന്താണ്", "എങ്ങനെയാണ്", "എന്തുകൊണ്ട്", "എപ്പോഴാണ്", "എവിടെയാണ്",
  "പറയാമോ", "വിശദീകരിക്കാമോ", "ചെയ്തിട്ടുണ്ടോ", "അറിയാമോ",
  "difference എന്താണ്", "use ചെയ്തിട്ടുണ്ടോ", "എങ്ങനെ handle ചെയ്യും",
  "work ചെയ്യുന്നത് എങ്ങനെയാണ്", "approach എന്താണ്"
];

export function extractQuestionsFromTranscript(
  text: string,
  existingQuestions: LiveDetectedQuestion[] = []
): LiveDetectedQuestion[] {
  if (!text || text.trim().length < 10) return [];

  const rawSentences = text
    .split(/(?<=[?.!\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);

  const newQuestions: LiveDetectedQuestion[] = [];

  for (const sentence of rawSentences) {
    const isQuestion = isSentenceAQuestion(sentence);
    if (!isQuestion) continue;

    const cleanedText = cleanSentence(sentence);

    // Deduplication check: check if a very similar question was already detected
    const isDuplicate = existingQuestions.some((eq) =>
      areQuestionsSimilar(eq.text, cleanedText)
    ) || newQuestions.some((nq) =>
      areQuestionsSimilar(nq.text, cleanedText)
    );

    if (!isDuplicate) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

      newQuestions.push({
        id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: timeStr,
        text: cleanedText,
        category: categorizeQuestion(cleanedText),
        isAnswered: false,
        confidence: computeConfidence(cleanedText),
      });
    }
  }

  return newQuestions;
}

function isSentenceAQuestion(s: string): boolean {
  const lower = s.toLowerCase();

  // 1. Punctuation check
  if (s.endsWith("?") || s.includes("?")) {
    return true;
  }

  // 2. English question starter check
  const hasEnglishStarter = ENGLISH_QUESTION_STARTERS.some((starter) =>
    lower.startsWith(starter) || lower.includes(` ${starter} `)
  );
  if (hasEnglishStarter && s.split(/\s+/).length >= 4) {
    return true;
  }

  // 3. Malayalam question marker check
  const hasMalayalamMarker = MALAYALAM_QUESTION_MARKERS.some((marker) =>
    s.includes(marker) || lower.includes(marker.toLowerCase())
  );
  if (hasMalayalamMarker) {
    return true;
  }

  return false;
}

function cleanSentence(s: string): string {
  let cleaned = s.replace(/^[-*•\s]+/, "").trim();
  if (!cleaned.endsWith("?") && !cleaned.endsWith(".")) {
    cleaned += "?";
  }
  return cleaned;
}

// Levenshtein / Word overlap similarity check to prevent duplicate questions from overlapping speech chunks
export function areQuestionsSimilar(q1: string, q2: string): boolean {
  const normalize = (t: string) =>
    t
      .toLowerCase()
      .replace(/[^\w\s\u0D00-\u0D7F]/g, "")
      .trim();

  const s1 = normalize(q1);
  const s2 = normalize(q2);

  if (s1 === s2) return true;
  if (s1.includes(s2) || s2.includes(s1)) return true;

  const words1 = new Set(s1.split(/\s+/).filter((w) => w.length > 2));
  const words2 = new Set(s2.split(/\s+/).filter((w) => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return false;

  let intersection = 0;
  for (const w of Array.from(words1)) {
    if (words2.has(w)) intersection++;
  }

  const overlapRatio = (2 * intersection) / (words1.size + words2.size);
  return overlapRatio > 0.65;
}

function categorizeQuestion(text: string): LiveDetectedQuestion["category"] {
  const lower = text.toLowerCase();

  if (
    lower.includes("design") ||
    lower.includes("architecture") ||
    lower.includes("scale") ||
    lower.includes("microservice") ||
    lower.includes("database") ||
    lower.includes("throughput") ||
    lower.includes("latency")
  ) {
    return "system_design";
  }

  if (
    lower.includes("tell me about a time") ||
    lower.includes("conflict") ||
    lower.includes("challenge") ||
    lower.includes("disagree") ||
    lower.includes("weakness") ||
    lower.includes("lead")
  ) {
    return "behavioral";
  }

  if (
    lower.includes("node") ||
    lower.includes("react") ||
    lower.includes("php") ||
    lower.includes("laravel") ||
    lower.includes("express") ||
    lower.includes("api") ||
    lower.includes("async") ||
    lower.includes("promise") ||
    lower.includes("mongodb") ||
    lower.includes("sql") ||
    lower.includes("hook")
  ) {
    return "technical";
  }

  return "general";
}

function computeConfidence(text: string): number {
  if (text.includes("?")) return 0.95;
  if (ENGLISH_QUESTION_STARTERS.some((st) => text.toLowerCase().startsWith(st))) return 0.88;
  return 0.75;
}
