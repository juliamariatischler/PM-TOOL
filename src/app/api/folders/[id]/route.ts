import { NextResponse } from "next/server";
import { requireApiSessionUser } from "@/lib/auth";
import { deleteFolder, updateFolder } from "@/lib/data";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireApiSessionUser())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const folder = await updateFolder(id, body);
  return NextResponse.json(folder);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireApiSessionUser())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await deleteFolder(id);
  return NextResponse.json({ ok: true });
}
