import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  getProviderConfigsForUser,
  createProviderConfig,
} from "@/lib/services/providerStore";
import { CreateProviderConfigInput } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const providers = await getProviderConfigsForUser(user.id);

    return NextResponse.json({
      success: true,
      providers,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load providers.";
    return NextResponse.json({ success: false, error: message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body: CreateProviderConfigInput = await req.json();

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ success: false, error: "Provider name is required." }, { status: 400 });
    }
    if (!body.providerType || !["gemini", "openai"].includes(body.providerType)) {
      return NextResponse.json(
        { success: false, error: "Invalid provider type. Must be 'gemini' or 'openai'." },
        { status: 400 }
      );
    }
    if (!body.apiKey || !body.apiKey.trim()) {
      return NextResponse.json({ success: false, error: "API key is required." }, { status: 400 });
    }
    if (!body.model || !body.model.trim()) {
      return NextResponse.json({ success: false, error: "Model identifier is required." }, { status: 400 });
    }

    const created = await createProviderConfig(user.id, body);

    return NextResponse.json(
      {
        success: true,
        provider: created,
        message: `Provider "${created.name}" configured and encrypted successfully.`,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create provider.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
