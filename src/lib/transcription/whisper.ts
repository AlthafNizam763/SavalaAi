import OpenAI, { toFile } from "openai";
import { ITranscriptionProvider } from "./interface";
import { TranscriptionResult } from "@/types";
import { serverConfig, isTranscriptionConfigured } from "../config";

export class WhisperTranscriptionProvider implements ITranscriptionProvider {
  public readonly name = "openai-whisper";

  public isConfigured(): boolean {
    return isTranscriptionConfigured();
  }

  public async transcribeAudio(
    buffer: Buffer,
    mimeType: string,
    filename: string = "recording.webm",
    language: string = "en"
  ): Promise<TranscriptionResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        transcript: "",
        provider: this.name,
        error:
          "Speech-to-text provider (OpenAI Whisper) is not configured. Please set TRANSCRIPTION_API_KEY or OPENAI_API_KEY in your environment (.env.local).",
      };
    }

    try {
      const apiKey = serverConfig.transcriptionApiKey || serverConfig.openaiApiKey;
      const openai = new OpenAI({ apiKey });

      // Convert Node Buffer to an OpenAI Uploadable File
      const audioFile = await toFile(buffer, filename, { type: mimeType });

      const response = await openai.audio.transcriptions.create({
        file: audioFile,
        model: serverConfig.transcriptionModel || "whisper-1",
        language: language === "ml" ? "ml" : "en",
        response_format: "verbose_json",
      });

      return {
        success: true,
        transcript: response.text ? response.text.trim() : "",
        durationSeconds: response.duration ? Math.round(response.duration) : undefined,
        provider: this.name,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Audio transcription failed.";
      return {
        success: false,
        transcript: "",
        provider: this.name,
        error: `Transcription Error: ${message}`,
      };
    }
  }
}
