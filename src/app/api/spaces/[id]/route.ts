import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const space = await prisma.space.update({ where: { id }, data: body });
  return NextResponse.json(space);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.space.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
