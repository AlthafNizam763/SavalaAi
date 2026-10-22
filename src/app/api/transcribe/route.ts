import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { processAudioTranscription } from "@/lib/transcription";

export async function POST(req: NextRequest) {
  try {
    await getAuthenticatedUser(req);

    const formData = await req.formData();
    const file = (formData.get("file") || formData.get("audio")) as File | null;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          transcript: "",
          provider: "transcription",
          error: "No audio file provided in request. Please upload audio/webm, audio/wav, or audio/mp4.",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || "audio/webm";
    const filename = file.name || "recording.webm";
    const language = (formData.get("language") as string) || "en";

    const result = await processAudioTranscription(buffer, mimeType, filename, language);

    if (!result.success) {
      return NextResponse.json(result, { status: 422 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal transcription error.";
    return NextResponse.json(
      {
        success: false,
        transcript: "",
        provider: "transcription",
        error: message,
      },
      { status: 500 }
    );
  }
}
