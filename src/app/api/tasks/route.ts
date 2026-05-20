import { NextResponse } from "next/server";
import { requireApiSessionUser } from "@/lib/auth";
import { createTask } from "@/lib/data";
import { STATUSES } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const user = await requireApiSessionUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";

    if (!title || !body.projectId) {
      return NextResponse.json({ error: "title and projectId are required" }, { status: 400 });
    }

    if (body.status !== undefined && (typeof body.status !== "string" || !STATUSES.includes(body.status))) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }

    if (
      body.assigneeIds !== undefined &&
      (!Array.isArray(body.assigneeIds) || body.assigneeIds.some((id: unknown) => typeof id !== "string"))
    ) {
      return NextResponse.json({ error: "assigneeIds must be a string array" }, { status: 400 });
    }

    const task = await createTask({
      title,
      projectId: body.projectId,
      creatorId: user.id,
      status: body.status,
      assigneeId: body.assigneeId,
      assigneeIds: Array.isArray(body.assigneeIds) ? body.assigneeIds : undefined,
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
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create task" },
      { status: 500 }
    );
  }
}
