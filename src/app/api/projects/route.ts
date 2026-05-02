import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const project = await prisma.project.create({
    data: {
      name: body.name,
      folderId: body.folderId,
      color: body.color ?? "#6366f1",
      position: body.position ?? 0,
    },
    include: { tasks: { include: { assignee: true, subtasks: true } } },
  });
  return NextResponse.json(project, { status: 201 });
}
