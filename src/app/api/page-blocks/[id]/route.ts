import { NextResponse } from "next/server";
import { requireApiSessionUser } from "@/lib/auth";
import { deletePageBlock, updatePageBlock } from "@/lib/data";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireApiSessionUser())) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const block = await updatePageBlock(id, body);
    return NextResponse.json(block);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update block" },
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
    await deletePageBlock(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete block" },
      { status: 500 }
    );
  }
}
