import { NextResponse } from "next/server";
import { requireApiSessionUser } from "@/lib/auth";
import { createSavedTaskView, listSavedTaskViews } from "@/lib/data";
import type { SavedTaskViewType } from "@/types";

const VIEW_TYPES: SavedTaskViewType[] = ["table", "board", "list"];

export async function GET() {
  try {
    if (!(await requireApiSessionUser())) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const views = await listSavedTaskViews();
    return NextResponse.json(views);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load saved views" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireApiSessionUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Neue Ansicht";
    const viewType = VIEW_TYPES.includes(body.viewType) ? body.viewType : "table";
    const view = await createSavedTaskView({
      name,
      viewType,
      spaceId: typeof body.spaceId === "string" ? body.spaceId : null,
      projectId: typeof body.projectId === "string" ? body.projectId : null,
      filters: body.filters && typeof body.filters === "object" ? body.filters : {},
      columns: Array.isArray(body.columns) ? body.columns : undefined,
      groupBy: typeof body.groupBy === "string" ? body.groupBy : null,
      createdById: user.id,
    });

    return NextResponse.json(view, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create saved view" },
      { status: 500 }
    );
  }
}
