import { NextResponse } from "next/server";
import { createTaskApproval } from "@/lib/data";
import { requireApiSessionUser } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json()) as { approverUserId?: string; note?: string };
  const approverUserId = typeof body.approverUserId === "string" ? body.approverUserId : "";

  if (!approverUserId) {
    return NextResponse.json({ error: "approverUserId is required" }, { status: 400 });
  }

  const approval = await createTaskApproval({
    taskId: id,
    approverUserId,
    requestedByUserId: user.id,
    note: typeof body.note === "string" ? body.note.trim() || null : null,
  });

  return NextResponse.json(approval, { status: 201 });
}
