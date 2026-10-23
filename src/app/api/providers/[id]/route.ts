import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  updateProviderConfig,
  deleteProviderConfig,
} from "@/lib/services/providerStore";
import { UpdateProviderConfigInput } from "@/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id } = await params;
    const body: UpdateProviderConfigInput = await req.json();

    const updated = await updateProviderConfig(user.id, id, body);

    return NextResponse.json({
      success: true,
      provider: updated,
      message: `Provider "${updated.name}" updated successfully.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update provider.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id } = await params;

    const success = await deleteProviderConfig(user.id, id);
    if (!success) {
      return NextResponse.json(
        { success: false, error: "Provider not found or could not be deleted." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Provider configuration deleted.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete provider.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
