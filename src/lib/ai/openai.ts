import OpenAI from "openai";
import { IAIProvider } from "./interface";
import { AIRequestPayload, AIResponsePayload } from "@/types";
import { serverConfig, isOpenAIConfigured } from "../config";
import { buildSystemPrompt, buildUserPrompt } from "./prompts";

export class OpenAIProvider implements IAIProvider {
  public readonly name = "openai" as const;

  public isConfigured(customKey?: string): boolean {
    if (customKey && customKey.trim().length > 0) return true;
    return isOpenAIConfigured();
  }

  public async generateResponse(
    payload: AIRequestPayload,
    options?: { apiKey?: string; model?: string }
  ): Promise<AIResponsePayload> {
    const effectiveKey = options?.apiKey?.trim() || serverConfig.openaiApiKey?.trim() || "";

    if (!effectiveKey) {
      return {
        success: false,
        content: "",
        provider: "openai",
        model: options?.model || payload.model || serverConfig.openaiModel,
        error: "OpenAI is not configured. Please add your OpenAI API Key in Settings > AI Providers, or set OPENAI_API_KEY in .env.local.",
      };
    }

    const modelName = options?.model || payload.model || serverConfig.openaiModel || "gpt-4o-mini";
    const systemPrompt = buildSystemPrompt(payload.action, payload);
    const userPrompt = buildUserPrompt(payload);

    try {
      const openai = new OpenAI({ apiKey: effectiveKey });
      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      });

      const text = completion.choices[0]?.message?.content || "";
      const structuredData = this.extractStructuredData(text, payload.action);

      return {
        success: true,
        content: text,
        provider: "openai",
        model: modelName,
        structuredData,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown OpenAI API error occurred.";
      return {
        success: false,
        content: "",
        provider: "openai",
        model: modelName,
        error: `OpenAI API Error: ${message}`,
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
