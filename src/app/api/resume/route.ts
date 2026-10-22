import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { processResumeUpload, getResumeForUser, deleteResumeForUser } from "@/lib/services/resumeService";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const resume = await getResumeForUser(user.id);
    return NextResponse.json({ success: true, resume }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch resume.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file was attached. Please upload a PDF or TXT resume." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/pdf";
    const fileName = file.name || "resume.pdf";

    const result = await processResumeUpload(user.id, buffer, fileName, mimeType);

    if (!result.success) {
      return NextResponse.json(result, { status: 422 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Resume upload processing failed.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    await deleteResumeForUser(user.id);
    return NextResponse.json({ success: true, message: "Resume deleted successfully." }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete resume.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
