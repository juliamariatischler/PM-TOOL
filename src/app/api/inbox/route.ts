import { NextResponse } from "next/server";
import { listInboxItems, markInboxItemRead } from "@/lib/data";
import { requireApiSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await requireApiSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const items = await listInboxItems(user.id);
  return NextResponse.json(items);
}

export async function PATCH(req: Request) {
  const user = await requireApiSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { mentionId?: string };
  const mentionId = typeof body.mentionId === "string" ? body.mentionId : "";

  if (!mentionId) {
    return NextResponse.json({ error: "mentionId is required" }, { status: 400 });
  }

  const item = await markInboxItemRead(mentionId, user.id);
  return NextResponse.json(item);
}
