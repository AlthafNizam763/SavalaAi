import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getSessionById, deleteSessionForUser } from "@/lib/services/store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id } = await params;

    const session = await getSessionById(user.id, id);
    if (!session) {
      return NextResponse.json({ success: false, error: "Session not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, session }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to retrieve session.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id } = await params;
    const body = await req.json();

    const session = await getSessionById(user.id, id);
    if (!session) {
      return NextResponse.json({ success: false, error: "Session not found." }, { status: 404 });
    }

    if (body.title) session.title = body.title;
    if (body.notes !== undefined) session.notes = body.notes;
    if (body.status) session.status = body.status;

    return NextResponse.json({ success: true, session }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update session.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id } = await params;

    const deleted = await deleteSessionForUser(user.id, id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Session not found or already deleted." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Session deleted." }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete session.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
