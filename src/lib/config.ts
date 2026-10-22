import { AIProvider } from "@/types";

export const serverConfig = {
  databaseUrl: process.env.DATABASE_URL || "",
  
  // Google Gemini
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  
  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  
  // Transcription
  transcriptionProvider: process.env.TRANSCRIPTION_PROVIDER || "openai",
  transcriptionApiKey: process.env.TRANSCRIPTION_API_KEY || process.env.OPENAI_API_KEY || "",
  transcriptionModel: process.env.TRANSCRIPTION_MODEL || "whisper-1",
  
  // Security & Limits
  authSecret: process.env.AUTH_SECRET || "savala-ai-secure-default-secret-key-32-chars",
  maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB || "10", 10),
  defaultAiProvider: (process.env.DEFAULT_AI_PROVIDER as AIProvider) || "gemini",
};

export function isGeminiConfigured(): boolean {
  return !!serverConfig.geminiApiKey && serverConfig.geminiApiKey.trim().length > 0;
}

export function isOpenAIConfigured(): boolean {
  return !!serverConfig.openaiApiKey && serverConfig.openaiApiKey.trim().length > 0;
}

export function isTranscriptionConfigured(): boolean {
  if (serverConfig.transcriptionProvider === "openai") {
    return !!serverConfig.transcriptionApiKey && serverConfig.transcriptionApiKey.trim().length > 0;
  }
  return true;
}

export function getProviderStatus() {
  return {
    gemini: {
      configured: isGeminiConfigured(),
      model: serverConfig.geminiModel,
    },
    openai: {
      configured: isOpenAIConfigured(),
      model: serverConfig.openaiModel,
    },
    transcription: {
      configured: isTranscriptionConfigured(),
      provider: serverConfig.transcriptionProvider,
      model: serverConfig.transcriptionModel,
    },
    defaultProvider: serverConfig.defaultAiProvider,
  };
}
