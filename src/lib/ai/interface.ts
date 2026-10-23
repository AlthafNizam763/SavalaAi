import { AIRequestPayload, AIResponsePayload } from "@/types";

export interface IAIProvider {
  name: "gemini" | "openai";
  isConfigured(customKey?: string): boolean;
  generateResponse(payload: AIRequestPayload, options?: { apiKey?: string; model?: string }): Promise<AIResponsePayload>;
}
