import { NextResponse } from "next/server";
import { deleteTaskDocument } from "@/lib/data";
import { requireApiSessionUser } from "@/lib/auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const user = await requireApiSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { documentId } = await params;
  await deleteTaskDocument(documentId);
  return NextResponse.json({ ok: true });
}
