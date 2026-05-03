import { NextResponse } from "next/server";
import { requireApiSessionUser } from "@/lib/auth";
import { createSpace, listWorkspace } from "@/lib/data";

export async function GET() {
  try {
    if (!(await requireApiSessionUser())) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const spaces = await listWorkspace();
    return NextResponse.json(spaces);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load spaces" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    if (!(await requireApiSessionUser())) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const space = await createSpace({
      name: body.name,
      color: body.color,
      icon: body.icon,
      position: body.position,
    });

    return NextResponse.json(space, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create space" },
      { status: 500 }
    );
  }
}
