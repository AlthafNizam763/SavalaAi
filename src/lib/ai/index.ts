import { AIProvider, AIRequestPayload, AIResponsePayload } from "@/types";
import { GeminiProvider } from "./gemini";
import { OpenAIProvider } from "./openai";
import { serverConfig } from "../config";

const geminiProvider = new GeminiProvider();
const openaiProvider = new OpenAIProvider();

export function getProvider(name?: AIProvider) {
  const chosen = name || serverConfig.defaultAiProvider;
  if (chosen === "openai") {
    return openaiProvider;
  }
  return geminiProvider;
}

export async function executeAIRequest(
  payload: AIRequestPayload,
  options?: { apiKey?: string; model?: string }
): Promise<AIResponsePayload> {
  const provider = getProvider(payload.provider);
  return await provider.generateResponse(payload, options);
}

export { geminiProvider, openaiProvider };
