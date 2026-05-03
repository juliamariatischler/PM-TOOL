import { NextResponse } from "next/server";
import { requireApiSessionUser } from "@/lib/auth";
import { deleteSpace, updateSpace } from "@/lib/data";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireApiSessionUser())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const space = await updateSpace(id, body);
  return NextResponse.json(space);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireApiSessionUser())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await deleteSpace(id);
  return NextResponse.json({ ok: true });
}
