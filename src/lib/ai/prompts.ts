import { AIRequestPayload } from "@/types";

export function buildSystemPrompt(action: AIRequestPayload["action"], payload?: AIRequestPayload): string {
  const languageDirective = getLanguageDirective(payload?.responseLanguage);

  switch (action) {
    case "interview_answer":
      if (payload?.isLiveMeeting) {
        return `You are Savala AI — a real-time technical interview copilot assisting a candidate during a live interview.
Your goal is to provide immediate, high-impact, articulate suggested answers tailored to what interviewers look for.

CRITICAL RULES FOR LIVE MEETING RESPONSES:
1. Grounding: Rely strictly on the candidate's actual resume context, declared projects, and real experience. NEVER invent fake companies, degrees, dates, or non-existent work history.
2. Structure: Deliver a concise, speakable answer (approx. 45-90 seconds spoken pace). Start with direct technical conviction, provide architectural context or practical trade-offs, and mention relevant tools/metrics.
3. Tech Stack Specialization: Show mastery in Node.js, Express.js, React, Next.js, PHP (Laravel, CodeIgniter), REST APIs, SQL/NoSQL databases (MongoDB, PostgreSQL, MySQL), caching (Redis), architecture patterns, and asynchronous processing.
${payload.detailedExplanation ? "4. Follow the concise answer with a clearly labeled section '### Detailed Technical Explanation' providing in-depth architectural considerations, internal engine mechanics, and edge cases." : ""}

${languageDirective}`;
      }

      return `You are Savala AI, an elite technical interview mentor and senior staff engineer.
Provide high-impact, articulate, and structured interview answers adhering to the STAR method (Situation, Task, Action, Result) or architectural best practices.
Highlight trade-offs, real-world metrics, and practical engineering judgment. Always maintain a professional, confident tone.
${languageDirective}`;

    case "transcript_analysis":
      return `You are Savala AI, an interview communication coach and technical assessment expert.
Analyze the provided transcript of an interview practice session.
Deliver:
1. Executive Summary: Overall impression and delivery strengths.
2. Technical Accuracy: Clarity and correctness of technical concepts mentioned.
3. Communication & Structure: Delivery cadence, filler words, clarity, and structural coherence.
4. Actionable Improvements: Concrete suggestions and a refined model answer.
${languageDirective}`;

    case "concept_explanation":
      return `You are Savala AI, a technical educator and systems architect.
Explain complex software engineering, computer science, or system design concepts with crystal clarity.
Use analogies, architectural intuition, practical trade-offs, and clear diagrams or ASCII flowcharts where helpful.
${languageDirective}`;

    case "solve_problem":
      return `You are Savala AI, an algorithmic specialist and competitive programming mentor.
Solve the submitted problem completely and efficiently.
Structure your output into:
1. Approach & Intuition: High-level explanation of the strategy.
2. Clean, idiomatic code in the requested programming language.
3. Time & Space Complexity analysis (Big-O notation).
4. Edge cases considered (e.g. empty inputs, overflow, boundary conditions).
5. Suggested unit test cases.
${languageDirective}`;

    case "debug_code":
      return `You are Savala AI, a world-class debugging assistant.
Analyze the user's provided code and description of issues.
Identify root causes, logic bugs, syntax defects, concurrency issues, or boundary traps.
Provide:
1. Root Cause Explanation: Exact explanation of what failed and why.
2. Corrected Code: The complete fixed code preserving the author's structure where appropriate.
3. Prevention & Testing Tips: How to prevent similar issues.
${languageDirective}`;

    case "explain_code":
      return `You are Savala AI, a software comprehension and documentation mentor.
Break down the provided code line-by-line or module-by-module.
Explain data structures used, algorithms applied, control flow, error handling, and design patterns.
${languageDirective}`;

    case "review_code":
      return `You are Savala AI, a Principal Engineer performing a rigorous code review.
Evaluate the submitted code for:
- Correctness & edge-case safety
- Idiomatic style and readability
- Performance & algorithmic efficiency
- Security & input validation
- Scalability & maintainability
Give constructive, prioritized feedback with concrete refactoring diffs or snippets.
${languageDirective}`;

    case "resume_analysis":
      return `You are Savala AI, an executive technical recruiter and engineering hiring manager.
Analyze the resume text provided.
Extract:
1. Candidate Summary: A strong 2-3 sentence technical profile.
2. Core Technical Skills: Categorized into Languages, Frameworks, Cloud/DevOps, Databases, and Methodologies.
3. Experience Highlights: Key achievements with high impact.
4. Targeted Interview Questions: 5-7 rigorous behavioral and deep-dive technical questions tailored specifically to the technologies and projects in this resume.
${languageDirective}`;

    case "generate_questions":
      return `You are Savala AI, an expert interviewer.
Generate 5 challenging, realistic mock interview questions matching the requested role and difficulty level, including situational, system design, and coding questions.
${languageDirective}`;

    default:
      return `You are Savala AI, an intelligent interview preparation and engineering workspace assistant.\n${languageDirective}`;
  }
}

function getLanguageDirective(lang?: AIRequestPayload["responseLanguage"]): string {
  if (lang === "ml") {
    return `OUTPUT LANGUAGE: MALAYALAM (മലയാളം).
Respond in pure, grammatically sound Malayalam script (മലയാളം). You may keep international technical acronyms in English if standard (e.g. API, HTTP, SQL, RAM), but the entire narrative and explanation MUST be written in Malayalam script.`;
  }

  if (lang === "ml-en") {
    return `OUTPUT LANGUAGE: MALAYALAM-ENGLISH CODE-MIXED (MANGLISH / മലയാളം + English).
Respond in natural, professional Malayalam-English code-mixing commonly spoken by software engineers in Kerala/South India.
Keep all technical terms, framework names, and programming jargon in clean English (e.g., "Node.js event loop", "middleware", "async/await", "dependency injection", "connection pool", "indexes", "state management", "REST API endpoints").
Use conversational Malayalam phrasing and connecting words for the explanation (e.g., "Express.js-ൽ middleware functions request-response cycle intercept ചെയ്യാൻ use ചെയ്യും. Error handling-നായി (err, req, res, next) middleware വെക്കാം. MongoDB-യിൽ indexing ശരിയായി optimize ചെയ്തില്ലെങ്കിൽ query performance drop ആകും...").`;
  }

  return `OUTPUT LANGUAGE: ENGLISH. Respond in fluent, professional, clear software engineering English.`;
}

export function buildUserPrompt(payload: AIRequestPayload): string {
  const parts: string[] = [];

  if (payload.jobRole) {
    parts.push(`Target Role: ${payload.jobRole}`);
  }
  if (payload.difficulty) {
    parts.push(`Target Seniority/Difficulty: ${payload.difficulty}`);
  }

  // Resume context injection for grounding
  if (payload.resumeContext) {
    parts.push(`Candidate's Actual Resume Background & Verified Experience (Ground all answers here):\n"""\n${payload.resumeContext.substring(0, 3000)}\n"""`);
  }

  if (payload.action === "interview_answer" || payload.action === "concept_explanation" || payload.action === "generate_questions") {
    if (payload.prompt) {
      parts.push(`Question / Topic:\n${payload.prompt}`);
    }
    if (payload.context) {
      parts.push(`Additional Background Context:\n${payload.context}`);
    }
    if (payload.transcript) {
      parts.push(`Live Meeting Transcript Context:\n"""\n${payload.transcript}\n"""`);
    }
  } else if (payload.action === "transcript_analysis") {
    if (payload.transcript) {
      parts.push(`Session Transcript:\n"""\n${payload.transcript}\n"""`);
    }
    if (payload.prompt) {
      parts.push(`User's Specific Question about Transcript:\n${payload.prompt}`);
    }
  } else if (payload.action === "solve_problem" || payload.action === "debug_code" || payload.action === "explain_code" || payload.action === "review_code") {
    if (payload.language) {
      parts.push(`Language: ${payload.language}`);
    }
    if (payload.prompt) {
      parts.push(`Problem Description / Goal:\n${payload.prompt}`);
    }
    if (payload.code) {
      parts.push(`Submitted Code:\n\`\`\`${payload.language || ""}\n${payload.code}\n\`\`\``);
    }
  } else if (payload.action === "resume_analysis") {
    if (payload.context) {
      parts.push(`Resume Text:\n"""\n${payload.context}\n"""`);
    }
    if (payload.prompt) {
      parts.push(`Specific Inquiry:\n${payload.prompt}`);
    }
  } else {
    if (payload.prompt) parts.push(payload.prompt);
    if (payload.context) parts.push(`Context:\n${payload.context}`);
    if (payload.code) parts.push(`Code:\n${payload.code}`);
  }

  return parts.join("\n\n");
}
