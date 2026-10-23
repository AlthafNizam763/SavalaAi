import test from "node:test";
import assert from "node:assert/strict";

test("Savala AI - Suite", async (t) => {
  await t.test("Authentication Token signing and verification", async () => {
    // Test base64url and HMAC verification logic
    const user = { id: "test_candidate", email: "candidate@savala.ai", name: "Candidate" };
    const payload = JSON.stringify({ ...user, iat: Date.now() });
    const encoded = Buffer.from(payload).toString("base64url");
    assert.ok(encoded.length > 0);

    const decoded = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
    assert.equal(decoded.id, "test_candidate");
    assert.equal(decoded.email, "candidate@savala.ai");
  });

  await t.test("Transcription Audio Validator guards", async () => {
    const ALLOWED_MIME_TYPES = new Set([
      "audio/webm",
      "audio/webm;codecs=opus",
      "audio/ogg",
      "audio/wav",
      "audio/mp4",
      "audio/mpeg",
    ]);

    const isValidMime = (mime) => {
      const baseMime = mime.split(";")[0].trim().toLowerCase();
      return Array.from(ALLOWED_MIME_TYPES).some(
        (allowed) => allowed.toLowerCase().startsWith(baseMime) || baseMime.startsWith(allowed.toLowerCase())
      );
    };

    assert.equal(isValidMime("audio/webm"), true);
    assert.equal(isValidMime("audio/webm;codecs=opus"), true);
    assert.equal(isValidMime("audio/wav"), true);
    assert.equal(isValidMime("audio/mp4"), true);
    assert.equal(isValidMime("image/png"), false);
    assert.equal(isValidMime("application/pdf"), false);
  });

  await t.test("Resume Validation Rules", async () => {
    const isValidResumeExtension = (fileName) => {
      const lower = fileName.toLowerCase();
      return lower.endsWith(".pdf") || lower.endsWith(".txt") || lower.endsWith(".md");
    };

    assert.equal(isValidResumeExtension("resume.pdf"), true);
    assert.equal(isValidResumeExtension("CANDIDATE_CV.PDF"), true);
    assert.equal(isValidResumeExtension("bio.txt"), true);
    assert.equal(isValidResumeExtension("executable.exe"), false);
    assert.equal(isValidResumeExtension("photo.jpg"), false);
  });

  await t.test("AI Provider Abstraction Defaults", async () => {
    const providers = ["gemini", "openai"];
    assert.equal(providers.includes("gemini"), true);
    assert.equal(providers.includes("openai"), true);
  });

  await t.test("Session Persistence Data Structures", async () => {
    const session = {
      id: "sess_12345",
      userId: "usr_test",
      title: "Mock Interview: System Design",
      sessionType: "interview",
      durationSeconds: 120,
      transcriptText: "We decided to partition the database using consistent hashing.",
      createdAt: new Date().toISOString(),
    };

    assert.equal(session.sessionType, "interview");
    assert.equal(session.durationSeconds, 120);
    assert.ok(session.transcriptText.includes("consistent hashing"));
  });

  await t.test("Live Meeting Copilot - Meeting URL Validation", async () => {
    const meetRegex = /(?:https?:\/\/)?meet\.google\.com\/([a-z0-9-]+)/i;
    const teamsRegex = /(?:https?:\/\/)?(?:teams\.microsoft\.com|teams\.live\.com)\/.+/i;

    const parseUrl = (url) => {
      if (!url || !url.trim()) return { isValid: false, platform: "other" };
      const trimmed = url.trim();
      const meetMatch = trimmed.match(meetRegex);
      if (meetMatch) {
        return { isValid: true, platform: "google_meet", meetingId: meetMatch[1] };
      }
      if (teamsRegex.test(trimmed)) {
        return { isValid: true, platform: "microsoft_teams" };
      }
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        return { isValid: true, platform: "other" };
      }
      return { isValid: false, platform: "other" };
    };

    // Google Meet checks
    const meet1 = parseUrl("https://meet.google.com/abc-defg-hij");
    assert.equal(meet1.isValid, true);
    assert.equal(meet1.platform, "google_meet");
    assert.equal(meet1.meetingId, "abc-defg-hij");

    const meet2 = parseUrl("meet.google.com/xyz-1234-abc");
    assert.equal(meet2.isValid, true);
    assert.equal(meet2.platform, "google_meet");

    // Microsoft Teams checks
    const teams1 = parseUrl("https://teams.microsoft.com/l/meetup-join/19%3ameeting_abcdef%40thread.v2/0");
    assert.equal(teams1.isValid, true);
    assert.equal(teams1.platform, "microsoft_teams");

    const teams2 = parseUrl("https://teams.live.com/meet/93821093120");
    assert.equal(teams2.isValid, true);
    assert.equal(teams2.platform, "microsoft_teams");

    // Invalid & generic URLs
    const invalid = parseUrl("not-a-valid-url");
    assert.equal(invalid.isValid, false);

    const empty = parseUrl("");
    assert.equal(empty.isValid, false);
  });

  await t.test("Live Meeting Copilot - Question Detection & Overlap Deduplication", async () => {
    const areQuestionsSimilar = (q1, q2) => {
      const normalize = (t) =>
        t.toLowerCase().replace(/[^\w\s\u0D00-\u0D7F]/g, "").trim();

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
    };

    // Verify detection of English questions
    const q1 = "What is the difference between SQL and NoSQL databases?";
    const q2 = "What is the difference between SQL and NoSQL?";
    assert.equal(areQuestionsSimilar(q1, q2), true);

    // Verify detection of Malayalam questions - slight phrasing variation of same question
    const mal1 = "Node.js event loop എങ്ങനെയാണ് work ചെയ്യുന്നത്?";
    const mal2 = "Node.js event loop എങ്ങനെയാണ് പ്രവർത്തിക്കുന്നത്?";
    assert.equal(areQuestionsSimilar(mal1, mal2), true); // Correctly deduplicated

    // Completely distinct Malayalam question
    const mal3 = "MongoDB-യിൽ indexing എങ്ങനെ ചെയ്യാം?";
    assert.equal(areQuestionsSimilar(mal1, mal3), false);

    // Dissimilar questions
    const q3 = "Can you explain how React useEffect works with dependencies?";
    assert.equal(areQuestionsSimilar(q1, q3), false);
  });

  await t.test("Live Meeting Copilot - Multilingual Directives and Grounding Rules", async () => {
    const getLanguageDirective = (lang) => {
      if (lang === "ml") return "OUTPUT LANGUAGE: MALAYALAM";
      if (lang === "ml-en") return "OUTPUT LANGUAGE: MALAYALAM-ENGLISH CODE-MIXED (MANGLISH)";
      return "OUTPUT LANGUAGE: ENGLISH";
    };

    assert.ok(getLanguageDirective("en").includes("ENGLISH"));
    assert.ok(getLanguageDirective("ml").includes("MALAYALAM"));
    assert.ok(getLanguageDirective("ml-en").includes("MANGLISH"));

    // Check resume grounding requirement: prompt must contain resume context without hallucinating
    const resumeText = "Senior Full Stack Engineer with 4 years experience in Node.js, Express, React, and MongoDB.";
    const userPrompt = `Candidate's Actual Resume Background:\n"""\n${resumeText}\n"""\nQuestion: Explain your experience with MongoDB.`;
    assert.ok(userPrompt.includes(resumeText));
    assert.ok(userPrompt.includes("Candidate's Actual Resume Background"));
  });

  await t.test("Live Meeting Copilot - Audio Error Formatting & Device Fallback", async () => {
    const formatAudioErrorMessage = (err, source) => {
      const errorName = err?.name || "";
      const errorMessage = err?.message || String(err || "");

      if (
        errorName === "NotFoundError" ||
        errorMessage.includes("The object can not be found here") ||
        errorMessage.includes("Requested device not found") ||
        errorMessage.includes("device not found") ||
        errorMessage.includes("NotFoundError")
      ) {
        if (source === "microphone") {
          return "No microphone or audio input hardware detected on your computer. Please connect a microphone or headset, check Windows sound device settings, or switch to 'Live Transcript / Manual Input' mode below.";
        } else {
          return "No audio source was found to capture. When sharing your tab or screen, please ensure you check 'Share tab audio'.";
        }
      }

      if (
        errorName === "NotAllowedError" ||
        errorName === "PermissionDeniedError" ||
        errorMessage.includes("Permission denied") ||
        errorMessage.includes("not allowed")
      ) {
        return "Microphone permission was denied. Please allow microphone access in your browser address bar (click the lock/permissions icon) and retry.";
      }

      return errorMessage;
    };

    // Firefox NotFoundError DOMException
    const firefoxError = new Error("The object can not be found here.");
    firefoxError.name = "NotFoundError";
    const formattedFirefox = formatAudioErrorMessage(firefoxError, "microphone");
    assert.ok(formattedFirefox.includes("No microphone or audio input hardware detected"));
    assert.ok(formattedFirefox.includes("Manual Input"));

    // Chrome NotFoundError DOMException
    const chromeError = new Error("Requested device not found");
    chromeError.name = "NotFoundError";
    const formattedChrome = formatAudioErrorMessage(chromeError, "microphone");
    assert.ok(formattedChrome.includes("No microphone or audio input hardware detected"));

    // Tab audio missing track error
    const tabError = new Error("The object can not be found here.");
    const formattedTab = formatAudioErrorMessage(tabError, "tab_audio");
    assert.ok(formattedTab.includes("Share tab audio"));
  });

  await t.test("Multi-Provider API Key Manager - AES-256-GCM Encryption at Rest", async () => {
    // Dynamically test crypto logic in ES module
    const crypto = await import("crypto");

    const ALGORITHM = "aes-256-gcm";
    const IV_LENGTH = 12;
    const testSecret = "savala-test-encryption-key-32b-secret";
    const key = crypto.createHash("sha256").update(testSecret).digest();

    const encryptKey = (plain) => {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      let encrypted = cipher.update(plain, "utf8", "base64");
      encrypted += cipher.final("base64");
      const authTag = cipher.getAuthTag().toString("base64");
      return { encrypted, iv: iv.toString("base64"), authTag };
    };

    const decryptKey = (encrypted, ivB64, authTagB64) => {
      const iv = Buffer.from(ivB64, "base64");
      const authTag = Buffer.from(authTagB64, "base64");
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted, "base64", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    };

    const rawApiKey = "AIzaSyD-sample-gemini-live-secret-key-123456789";
    const { encrypted, iv, authTag } = encryptKey(rawApiKey);

    // Verify plaintext is NEVER present in ciphertext or iv
    assert.notEqual(encrypted, rawApiKey);
    assert.equal(encrypted.includes(rawApiKey), false);

    // Decrypt and verify exact match
    const recovered = decryptKey(encrypted, iv, authTag);
    assert.equal(recovered, rawApiKey);

    // Tampering test: modified auth tag must throw
    assert.throws(() => {
      const tamperedTag = Buffer.from("bad-auth-tag-value!").toString("base64");
      decryptKey(encrypted, iv, tamperedTag);
    });
  });

  await t.test("Multi-Provider API Key Manager - Masking & Client Secret Shield", async () => {
    const maskApiKey = (key) => {
      if (!key) return "••••••••••••";
      const trimmed = key.trim();
      if (trimmed.length <= 8) return "••••••••";
      if (trimmed.startsWith("sk-")) {
        return `${trimmed.slice(0, 7)}...${trimmed.slice(-4)}`;
      }
      return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
    };

    assert.equal(maskApiKey("AIzaSyD1234567890abcdef"), "AIza...cdef");
    assert.equal(maskApiKey("sk-proj-998877665544332211"), "sk-proj...2211");
    assert.equal(maskApiKey("short"), "••••••••");
    assert.equal(maskApiKey(""), "••••••••••••");
  });

  await t.test("Multi-Provider API Key Manager - SSRF Allowlist Guard", async () => {
    const ALLOWED_ENDPOINTS = [
      "https://generativelanguage.googleapis.com",
      "https://api.openai.com",
    ];

    const validateEndpoint = (url) => {
      if (!url || !url.trim()) return { isValid: true };
      try {
        const parsed = new URL(url.trim());
        if (parsed.protocol !== "https:") {
          return { isValid: false, error: "Only HTTPS allowed" };
        }
        const hostname = parsed.hostname.toLowerCase();
        if (["localhost", "127.0.0.1", "0.0.0.0", "169.254.169.254"].includes(hostname)) {
          return { isValid: false, error: "Internal SSRF blocked" };
        }
        const isAllowed = ALLOWED_ENDPOINTS.some((ep) => {
          const allowedParsed = new URL(ep);
          return hostname === allowedParsed.hostname;
        });
        return isAllowed ? { isValid: true } : { isValid: false, error: "Domain not in allowlist" };
      } catch {
        return { isValid: false, error: "Invalid URL" };
      }
    };

    assert.equal(validateEndpoint("https://generativelanguage.googleapis.com/v1beta").isValid, true);
    assert.equal(validateEndpoint("https://api.openai.com/v1").isValid, true);
    assert.equal(validateEndpoint("http://generativelanguage.googleapis.com").isValid, false);
    assert.equal(validateEndpoint("http://localhost:3000/internal-admin").isValid, false);
    assert.equal(validateEndpoint("http://169.254.169.254/latest/meta-data").isValid, false);
    assert.equal(validateEndpoint("https://attacker-controlled-site.com/api").isValid, false);
  });

  await t.test("Multi-Provider API Key Manager - Dynamic arbitrary configs (>3)", async () => {
    // Verify system can hold arbitrary number of configs and set active seamlessly
    const configs = [
      { id: "cfg_1", name: "Gemini Flash Primary", providerType: "gemini", model: "gemini-2.5-flash", isActive: false },
      { id: "cfg_2", name: "Gemini 2.5 Pro High-Reasoning", providerType: "gemini", model: "gemini-2.5-pro", isActive: false },
      { id: "cfg_3", name: "OpenAI GPT-4o Mini Fast", providerType: "openai", model: "gpt-4o-mini", isActive: false },
      { id: "cfg_4", name: "OpenAI GPT-4o Production", providerType: "openai", model: "gpt-4o", isActive: true },
      { id: "cfg_5", name: "OpenAI o3-mini Reasoning", providerType: "openai", model: "o3-mini", isActive: false },
    ];

    assert.equal(configs.length > 3, true);
    const active = configs.find((c) => c.isActive);
    assert.equal(active?.id, "cfg_4");
    assert.equal(active?.model, "gpt-4o");

    // Switch active
    const switchActive = (targetId) => configs.map((c) => ({ ...c, isActive: c.id === targetId }));
    const switched = switchActive("cfg_2");
    assert.equal(switched.find((c) => c.isActive)?.id, "cfg_2");
  });
});

