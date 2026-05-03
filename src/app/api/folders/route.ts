import { NextResponse } from "next/server";
import { requireApiSessionUser } from "@/lib/auth";
import { createFolder } from "@/lib/data";

export async function POST(req: Request) {
  if (!(await requireApiSessionUser())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const folder = await createFolder({
    name: body.name,
    spaceId: body.spaceId,
    position: body.position,
  });
  return NextResponse.json(folder, { status: 201 });
}
