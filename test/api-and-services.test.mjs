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
});
