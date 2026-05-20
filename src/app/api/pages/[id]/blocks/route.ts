import { NextResponse } from "next/server";
import { requireApiSessionUser } from "@/lib/auth";
import { createPageBlock } from "@/lib/data";
import type { DashboardBlockType, DashboardBlockWidth } from "@/types";

const BLOCK_TYPES: DashboardBlockType[] = ["text", "shortcuts", "links", "task_view", "stats"];
const WIDTHS: DashboardBlockWidth[] = ["full", "half"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireApiSessionUser())) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const blockType = BLOCK_TYPES.includes(body.blockType) ? body.blockType : "text";
    const width = WIDTHS.includes(body.width) ? body.width : "half";
    const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Block";

    const block = await createPageBlock({
      pageId: id,
      blockType,
      title,
      config: body.config && typeof body.config === "object" ? body.config : {},
      content: body.content && typeof body.content === "object" ? body.content : {},
      width,
      position: typeof body.position === "number" ? body.position : 0,
    });

    return NextResponse.json(block, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create block" },
      { status: 500 }
    );
  }
}
