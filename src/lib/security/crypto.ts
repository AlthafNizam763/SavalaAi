import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || process.env.AUTH_SECRET || "savala-default-secure-encryption-key-32b";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts an API key using AES-256-GCM.
 * Never stores plaintext API keys in the database.
 */
export function encryptApiKey(plainKey: string): {
  encryptedApiKey: string;
  iv: string;
  authTag: string;
  maskedKey: string;
} {
  if (!plainKey || !plainKey.trim()) {
    throw new Error("Cannot encrypt empty API key");
  }

  const trimmed = plainKey.trim();
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(trimmed, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag().toString("base64");

  return {
    encryptedApiKey: encrypted,
    iv: iv.toString("base64"),
    authTag,
    maskedKey: maskApiKey(trimmed),
  };
}

/**
 * Decrypts an API key in-memory on the server.
 * Never exposes the decrypted key to client responses or logs.
 */
export function decryptApiKey(encryptedApiKey: string, ivBase64: string, authTagBase64: string): string {
  if (!encryptedApiKey || !ivBase64 || !authTagBase64) {
    throw new Error("Missing decryption parameters");
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedApiKey, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Masks an API key for safe UI display (e.g. AIza...7890 or sk-proj...1234).
 */
export function maskApiKey(key: string): string {
  if (!key) return "••••••••••••";
  const trimmed = key.trim();
  if (trimmed.length <= 8) {
    return "••••••••";
  }

  if (trimmed.startsWith("sk-")) {
    const prefix = trimmed.slice(0, 7);
    const suffix = trimmed.slice(-4);
    return `${prefix}...${suffix}`;
  }

  const prefix = trimmed.slice(0, 4);
  const suffix = trimmed.slice(-4);
  return `${prefix}...${suffix}`;
}

/**
 * Strict allowlist for custom provider endpoints to prevent SSRF vulnerabilities.
 */
const ALLOWED_ENDPOINTS = [
  "https://generativelanguage.googleapis.com",
  "https://api.openai.com",
];

export function validateProviderEndpoint(endpointUrl?: string | null): { isValid: boolean; error?: string } {
  if (!endpointUrl || !endpointUrl.trim()) {
    return { isValid: true };
  }

  try {
    const parsed = new URL(endpointUrl.trim());

    if (parsed.protocol !== "https:") {
      return { isValid: false, error: "Only secure HTTPS endpoints are permitted." };
    }

    const host = parsed.hostname.toLowerCase();

    // Block localhost, private IPs, loopbacks, and cloud metadata
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "169.254.169.254" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
    ) {
      return { isValid: false, error: "Private or internal network addresses are forbidden (SSRF protection)." };
    }

    const isAllowed = ALLOWED_ENDPOINTS.some((allowed) => endpointUrl.startsWith(allowed));
    if (!isAllowed) {
      return {
        isValid: false,
        error: "Endpoint must point to official provider domains (generativelanguage.googleapis.com or api.openai.com).",
      };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: "Invalid endpoint URL format." };
  }
}
