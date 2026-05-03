import { NextResponse } from "next/server";
import { requireApiSessionUser } from "@/lib/auth";
import { createProject } from "@/lib/data";

export async function POST(req: Request) {
  if (!(await requireApiSessionUser())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const project = await createProject({
    name: body.name,
    folderId: body.folderId,
    color: body.color,
    position: body.position,
  });
  return NextResponse.json(project, { status: 201 });
}
