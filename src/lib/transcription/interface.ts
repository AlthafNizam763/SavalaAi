import { TranscriptionResult } from "@/types";

export interface ITranscriptionProvider {
  name: string;
  isConfigured(): boolean;
  transcribeAudio(buffer: Buffer, mimeType: string, filename?: string, language?: string): Promise<TranscriptionResult>;
}
