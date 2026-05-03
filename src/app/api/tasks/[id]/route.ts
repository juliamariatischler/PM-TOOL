import { NextResponse } from "next/server";
import { requireApiSessionUser } from "@/lib/auth";
import { deleteTask, getTaskDetail, updateTask } from "@/lib/data";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireApiSessionUser())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const task = await getTaskDetail(id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
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
  if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId || null;
  if (body.startDate !== undefined) data.startDate = body.startDate || null;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate || null;
  if (body.description !== undefined) data.description = body.description;
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.effort !== undefined) data.effort = body.effort;
  if (body.plannedCost !== undefined) data.plannedCost = body.plannedCost;
  if (body.position !== undefined) data.position = body.position;
  if (body.parentId !== undefined) data.parentId = body.parentId || null;

  const task = await updateTask(id, data);
  return NextResponse.json(task);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireApiSessionUser())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await deleteTask(id);
  return NextResponse.json({ ok: true });
}
