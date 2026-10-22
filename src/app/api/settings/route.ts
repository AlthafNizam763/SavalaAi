import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { getSettingsForUser, updateSettingsForUser } from "@/lib/services/store";

const updateSettingsSchema = z.object({
  activeProvider: z.enum(["gemini", "openai"]).optional(),
  preferredModel: z.string().max(100).optional(),
  audioAutoTranscribe: z.boolean().optional(),
  dataRetentionDays: z.number().int().min(1).max(365).optional(),
  defaultJobRole: z.string().max(100).optional(),
  interviewDifficulty: z.enum(["Junior", "Medium", "Senior", "Staff"]).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const settings = await getSettingsForUser(user.id);
    return NextResponse.json({ success: true, settings }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load settings.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();

    const parseResult = updateSettingsSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: "Invalid settings payload", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateSettingsForUser(user.id, parseResult.data);
    return NextResponse.json({ success: true, settings: updated }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update settings.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
