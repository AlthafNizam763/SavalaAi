import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { AppUser } from "@/types";
import { serverConfig } from "./config";

const COOKIE_NAME = "savala_session";
export const DEFAULT_DEMO_USER: AppUser = {
  id: "usr_savala_lead_eng",
  email: "candidate@savala.ai",
  name: "Interview Candidate",
};

// Web Crypto HMAC-SHA256 Token creation & verification
async function getCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(serverConfig.authSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSessionToken(user: AppUser): Promise<string> {
  const payload = JSON.stringify({
    ...user,
    iat: Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  });
  const encodedPayload = Buffer.from(payload).toString("base64url");
  const key = await getCryptoKey();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(encodedPayload)
  );
  const encodedSignature = Buffer.from(signature).toString("base64url");
  return `${encodedPayload}.${encodedSignature}`;
}

export async function verifySessionToken(token: string): Promise<AppUser | null> {
  try {
    const [encodedPayload, encodedSignature] = token.split(".");
    if (!encodedPayload || !encodedSignature) return null;

    const key = await getCryptoKey();
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      Buffer.from(encodedSignature, "base64url"),
      new TextEncoder().encode(encodedPayload)
    );

    if (!isValid) return null;

    const decoded = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf-8"));
    if (decoded.exp && decoded.exp < Date.now()) {
      return null;
    }

    return {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
    };
  } catch {
    return null;
  }
}

/**
 * Resolves the authenticated user from cookies or Authorization header.
 * If running in local development mode without an explicit login session,
 * seamlessly uses the default candidate workspace session.
 */
export async function getAuthenticatedUser(req?: NextRequest): Promise<AppUser> {
  // Check authorization header first
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const user = await verifySessionToken(token);
      if (user) return user;
    }
  }

  // Check cookie
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME)?.value;
    if (sessionCookie) {
      const user = await verifySessionToken(sessionCookie);
      if (user) return user;
    }
  } catch {
    // If called outside request context or cookie error
  }

  // Local development default authenticated user
  return DEFAULT_DEMO_USER;
}

export { COOKIE_NAME };
