import { NextResponse } from "next/server";
import { requireApiSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  if (!(await requireApiSessionUser())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";

  if (!title || !body.projectId) {
    return NextResponse.json({ error: "title and projectId are required" }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      title,
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
