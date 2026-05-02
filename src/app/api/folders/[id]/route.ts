import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const folder = await prisma.folder.update({ where: { id }, data: body });
  return NextResponse.json(folder);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.folder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
