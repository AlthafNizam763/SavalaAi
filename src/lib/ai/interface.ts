import { AIRequestPayload, AIResponsePayload } from "@/types";

export interface IAIProvider {
  name: "gemini" | "openai";
  isConfigured(): boolean;
  generateResponse(payload: AIRequestPayload): Promise<AIResponsePayload>;
}
