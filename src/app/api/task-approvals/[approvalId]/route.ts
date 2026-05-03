import { NextResponse } from "next/server";
import { deleteTaskApproval, updateTaskApproval } from "@/lib/data";
import { requireApiSessionUser } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ approvalId: string }> }) {
  const user = await requireApiSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { approvalId } = await params;
  const body = (await req.json()) as { status?: "pending" | "approved" | "rejected"; note?: string | null };

  const approval = await updateTaskApproval(approvalId, {
    actingUserId: user.id,
    status: body.status,
    note: body.note ?? undefined,
  });

  return NextResponse.json(approval);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ approvalId: string }> }) {
  const user = await requireApiSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { approvalId } = await params;
  await deleteTaskApproval(approvalId);
  return NextResponse.json({ ok: true });
}
