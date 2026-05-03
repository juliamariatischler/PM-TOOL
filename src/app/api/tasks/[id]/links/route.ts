import { NextResponse } from "next/server";
import { createTaskLink } from "@/lib/data";
import { requireApiSessionUser } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json()) as {
    linkType?: "internal" | "external";
    linkedTaskId?: string;
    title?: string;
    url?: string;
  };

  const linkType = body.linkType === "external" ? "external" : "internal";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const linkedTaskId = typeof body.linkedTaskId === "string" ? body.linkedTaskId : "";
  const url = typeof body.url === "string" ? body.url.trim() : "";

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  if (linkType === "internal" && !linkedTaskId) {
    return NextResponse.json({ error: "linkedTaskId is required" }, { status: 400 });
  }

  if (linkType === "external" && !url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const link = await createTaskLink({
    taskId: id,
    linkType,
    linkedTaskId: linkType === "internal" ? linkedTaskId : null,
    title,
    url: linkType === "external" ? url : null,
    createdBy: user.id,
  });

  return NextResponse.json(link, { status: 201 });
}
