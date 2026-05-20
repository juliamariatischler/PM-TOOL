import { NextResponse } from "next/server";
import { requireApiSessionUser } from "@/lib/auth";
import { deleteDashboardPage, updateDashboardPage } from "@/lib/data";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireApiSessionUser())) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const page = await updateDashboardPage(id, body);
    return NextResponse.json(page);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update page" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireApiSessionUser())) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await deleteDashboardPage(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete page" },
      { status: 500 }
    );
  }
}
