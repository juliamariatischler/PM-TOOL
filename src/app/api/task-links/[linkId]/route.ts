import { NextResponse } from "next/server";
import { deleteTaskLink } from "@/lib/data";
import { requireApiSessionUser } from "@/lib/auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ linkId: string }> }) {
  const user = await requireApiSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { linkId } = await params;
  await deleteTaskLink(linkId);
  return NextResponse.json({ ok: true });
}
