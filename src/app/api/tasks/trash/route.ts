import { NextResponse } from "next/server";
import { requireApiSessionUser } from "@/lib/auth";
import { emptyTaskTrash } from "@/lib/data";

export async function DELETE() {
  if (!(await requireApiSessionUser())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await emptyTaskTrash();
  return NextResponse.json({ ok: true });
}
