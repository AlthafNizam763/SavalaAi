import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { getSessionsForUser, createSessionForUser, clearAllSessionsForUser } from "@/lib/services/store";

const createSessionSchema = z.object({
  title: z.string().min(1).max(200),
  sessionType: z.enum(["interview", "coding", "transcript_review"]),
  transcriptText: z.string().optional(),
  durationSeconds: z.number().int().min(0).optional(),
  targetRole: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1),
        provider: z.string().optional(),
        model: z.string().optional(),
      })
    )
    .optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const sessions = await getSessionsForUser(user.id);
    return NextResponse.json({ success: true, sessions }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load sessions.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();

    const parseResult = createSessionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: "Invalid session payload", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const session = await createSessionForUser(user.id, parseResult.data);
    return NextResponse.json({ success: true, session }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save session.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    await clearAllSessionsForUser(user.id);
    return NextResponse.json({ success: true, message: "All sessions cleared." }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to clear sessions.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
