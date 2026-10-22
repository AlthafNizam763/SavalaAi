import { GoogleGenAI } from "@google/genai";
import { IAIProvider } from "./interface";
import { AIRequestPayload, AIResponsePayload } from "@/types";
import { serverConfig, isGeminiConfigured } from "../config";
import { buildSystemPrompt, buildUserPrompt } from "./prompts";

export class GeminiProvider implements IAIProvider {
  public readonly name = "gemini" as const;

  public isConfigured(): boolean {
    return isGeminiConfigured();
  }

  public async generateResponse(payload: AIRequestPayload): Promise<AIResponsePayload> {
    if (!this.isConfigured()) {
      return {
        success: false,
        content: "",
        provider: "gemini",
        model: payload.model || serverConfig.geminiModel,
        error: "Google Gemini is not configured. Please set GEMINI_API_KEY in your environment (.env.local).",
      };
    }

    const modelName = payload.model || serverConfig.geminiModel || "gemini-2.5-flash";
    const systemPrompt = buildSystemPrompt(payload.action, payload);
    const userPrompt = buildUserPrompt(payload);

    try {
      const ai = new GoogleGenAI({ apiKey: serverConfig.geminiApiKey });
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n---\n\n${userPrompt}` }],
          },
        ],
      });

      const text = response.text || "";

      // Parse structured sections if applicable
      const structuredData = this.extractStructuredData(text, payload.action);

      return {
        success: true,
        content: text,
        provider: "gemini",
        model: modelName,
        structuredData,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown Gemini API error occurred.";
      return {
        success: false,
        content: "",
        provider: "gemini",
        model: modelName,
        error: `Gemini API Error: ${message}`,
      };
    }
  }

  private extractStructuredData(text: string, action: AIRequestPayload["action"]) {
    const data: AIResponsePayload["structuredData"] = {};

    // Code block extraction
    const codeBlockMatch = text.match(/```(?:[a-zA-Z0-9_-]+)?\n([\s\S]*?)```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      data.code = codeBlockMatch[1].trim();
    }

    // Complexity extraction
    const timeMatch = text.match(/Time Complexity:?\s*([^\n]+)/i);
    const spaceMatch = text.match(/Space Complexity:?\s*([^\n]+)/i);
    if (timeMatch || spaceMatch) {
      data.complexity = {
        time: timeMatch ? timeMatch[1].trim() : undefined,
        space: spaceMatch ? spaceMatch[1].trim() : undefined,
      };
    }

    // Edge cases extraction
    if (text.includes("Edge Cases") || text.includes("Edge cases")) {
      const edgeSection = text.split(/Edge [cC]ases:?/)[1]?.split(/###|\n\n[A-Z]/)[0];
      if (edgeSection) {
        data.edgeCases = edgeSection
          .split("\n")
          .map((line) => line.replace(/^[-*•0-9.)\s]+/, "").trim())
          .filter((line) => line.length > 5)
          .slice(0, 5);
      }
    }

    // Resume skills extraction
    if (action === "resume_analysis") {
      const skillsSection = text.match(/(?:Skills|Technologies|Core Competencies):?\s*([\s\S]*?)(?:\n\n###|\n\n[A-Z]|$)/i);
      if (skillsSection && skillsSection[1]) {
        data.skills = skillsSection[1]
          .split(/[,;\n•\-\*]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 1 && s.length < 40 && !s.toLowerCase().includes("skills"))
          .slice(0, 18);
      }
    }

    return Object.keys(data).length > 0 ? data : undefined;
  }
}
