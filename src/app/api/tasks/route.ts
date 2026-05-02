import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const task = await prisma.task.create({
    data: {
      title: body.title,
      projectId: body.projectId,
      status: body.status ?? "New",
      assigneeId: body.assigneeId ?? null,
      parentId: body.parentId ?? null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      description: body.description ?? null,
      priority: body.priority ?? "Medium",
      position: body.position ?? 0,
    },
    include: { assignee: true, subtasks: true },
  });
  return NextResponse.json(task, { status: 201 });
}
