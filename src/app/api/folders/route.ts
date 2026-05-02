import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const folder = await prisma.folder.create({
    data: { name: body.name, spaceId: body.spaceId, position: body.position ?? 0 },
    include: { projects: true },
  });
  return NextResponse.json(folder, { status: 201 });
}
