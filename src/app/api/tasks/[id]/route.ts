import { NextResponse } from "next/server";
import { requireApiSessionUser } from "@/lib/auth";
import { deleteTask, getTaskDetail, setTaskCreatorIfMissing, updateTask } from "@/lib/data";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  let task = await getTaskDetail(id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!task.createdById) {
    task = await setTaskCreatorIfMissing(id, user.id);
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(task);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireApiSessionUser())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.status !== undefined) data.status = body.status;
  if (body.projectId !== undefined) data.projectId = body.projectId;
  if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId || null;
  if (body.assigneeIds !== undefined) data.assigneeIds = body.assigneeIds;
  if (body.startDate !== undefined) data.startDate = body.startDate || null;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate || null;
  if (body.description !== undefined) data.description = body.description;
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.effort !== undefined) data.effort = body.effort;
  if (body.actualTimeMinutes !== undefined) data.actualTimeMinutes = body.actualTimeMinutes;
  if (body.timerStartedAt !== undefined) data.timerStartedAt = body.timerStartedAt || null;
  if (body.plannedCost !== undefined) data.plannedCost = body.plannedCost;
  if (body.position !== undefined) data.position = body.position;
  if (body.parentId !== undefined) data.parentId = body.parentId || null;
  if (body.archivedAt !== undefined) data.archivedAt = body.archivedAt || null;
  if (body.deletedAt !== undefined) data.deletedAt = body.deletedAt || null;

  const task = await updateTask(id, data);
  return NextResponse.json(task);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireApiSessionUser())) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    await deleteTask(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete task" },
      { status: 500 }
    );
  }
}
