import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { executeAIRequest } from "@/lib/ai";
import { getSettingsForUser } from "@/lib/services/store";
import { AIRequestPayload } from "@/types";

const aiRequestSchema = z.object({
  action: z.enum([
    "interview_answer",
    "concept_explanation",
    "transcript_analysis",
    "solve_problem",
    "debug_code",
    "explain_code",
    "review_code",
    "resume_analysis",
    "generate_questions",
  ]),
  prompt: z.string().max(20000).optional(),
  context: z.string().max(50000).optional(),
  code: z.string().max(50000).optional(),
  language: z.string().max(50).optional(),
  transcript: z.string().max(50000).optional(),
  jobRole: z.string().max(100).optional(),
  difficulty: z.enum(["Junior", "Medium", "Senior", "Staff"]).optional(),
  provider: z.enum(["gemini", "openai"]).optional(),
  model: z.string().max(100).optional(),
  responseLanguage: z.enum(["en", "ml", "ml-en"]).optional(),
  detailedExplanation: z.boolean().optional(),
  resumeContext: z.string().max(25000).optional(),
  isLiveMeeting: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();

    const parseResult = aiRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // If provider is not specified in the payload, use user's saved preference
    let activeProvider = data.provider;
    if (!activeProvider) {
      const settings = await getSettingsForUser(user.id);
      activeProvider = settings.activeProvider;
    }

    const payload: AIRequestPayload = {
      ...data,
      provider: activeProvider,
    };

    const response = await executeAIRequest(payload);

    if (!response.success && response.error) {
      return NextResponse.json(response, { status: 502 });
    }

    return NextResponse.json(response, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal AI route error";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
