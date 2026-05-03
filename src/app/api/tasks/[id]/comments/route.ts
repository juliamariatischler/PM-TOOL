import { NextResponse } from "next/server";
import { createTaskComment } from "@/lib/data";
import { requireApiSessionUser } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json()) as { body?: string };
  const commentBody = typeof body.body === "string" ? body.body.trim() : "";

  if (!commentBody) {
    return NextResponse.json({ error: "comment body is required" }, { status: 400 });
  }

  const comment = await createTaskComment({
    taskId: id,
    authorId: user.id,
    body: commentBody,
  });

  return NextResponse.json(comment, { status: 201 });
}
