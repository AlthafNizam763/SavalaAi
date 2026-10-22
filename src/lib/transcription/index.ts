import { ITranscriptionProvider } from "./interface";
import { WhisperTranscriptionProvider } from "./whisper";
import { serverConfig } from "../config";
import { TranscriptionResult } from "@/types";

const whisperProvider = new WhisperTranscriptionProvider();

export function getTranscriptionProvider(): ITranscriptionProvider {
  return whisperProvider;
}

const ALLOWED_MIME_TYPES = new Set([
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/ogg",
  "audio/ogg;codecs=opus",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/mpeg",
  "audio/mp3",
]);

export async function processAudioTranscription(
  buffer: Buffer,
  mimeType: string,
  filename: string = "recording.webm",
  language: string = "en"
): Promise<TranscriptionResult> {
  // Validate MIME type
  const baseMime = mimeType.split(";")[0].trim().toLowerCase();
  const isAllowed = Array.from(ALLOWED_MIME_TYPES).some(
    (allowed) => allowed.toLowerCase().startsWith(baseMime) || baseMime.startsWith(allowed.toLowerCase())
  );

  if (!isAllowed) {
    return {
      success: false,
      transcript: "",
      provider: "transcription-router",
      error: `Unsupported audio format "${mimeType}". Supported audio formats include WebM, WAV, MP4, and OGG.`,
    };
  }

  // Validate file size (MAX_UPLOAD_MB)
  const maxBytes = serverConfig.maxUploadMb * 1024 * 1024;
  if (buffer.length > maxBytes) {
    return {
      success: false,
      transcript: "",
      provider: "transcription-router",
      error: `Audio file exceeds maximum size limit of ${serverConfig.maxUploadMb}MB.`,
    };
  }

  if (buffer.length < 500) {
    return {
      success: false,
      transcript: "",
      provider: "transcription-router",
      error: "Audio recording is empty or too short. Please speak clearly into your microphone.",
    };
  }

  const provider = getTranscriptionProvider();
  return await provider.transcribeAudio(buffer, mimeType, filename, language);
}

export { whisperProvider };
