import { NextResponse } from "next/server";
import { requireApiSessionUser } from "@/lib/auth";
import { createSpace, listWorkspace } from "@/lib/data";

export async function GET() {
  if (!(await requireApiSessionUser())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const spaces = await listWorkspace();
  return NextResponse.json(spaces);
}

export async function POST(req: Request) {
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
}
