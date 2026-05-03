import { NextResponse } from "next/server";
import { requireApiSessionUser } from "@/lib/auth";
import { createTask } from "@/lib/data";

export async function POST(req: Request) {
  const user = await requireApiSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";

  if (!title || !body.projectId) {
    return NextResponse.json({ error: "title and projectId are required" }, { status: 400 });
  }

  const task = await createTask({
    title,
    projectId: body.projectId,
    creatorId: user.id,
    status: body.status,
    assigneeId: body.assigneeId,
    parentId: body.parentId,
    startDate: body.startDate,
    dueDate: body.dueDate,
    description: body.description,
    priority: body.priority,
    effort: body.effort,
    plannedCost: body.plannedCost,
    position: body.position,
  });
  return NextResponse.json(task, { status: 201 });
}
