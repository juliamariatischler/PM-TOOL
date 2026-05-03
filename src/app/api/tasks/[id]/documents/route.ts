import { NextResponse } from "next/server";
import { createTaskDocument } from "@/lib/data";
import { requireApiSessionUser } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json()) as {
    title?: string;
    url?: string;
    documentType?: "word" | "excel" | "powerpoint" | "file";
  };

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const documentType = body.documentType ?? "file";

  if (!title || !url) {
    return NextResponse.json({ error: "title and url are required" }, { status: 400 });
  }

  const document = await createTaskDocument({
    taskId: id,
    provider: "microsoft",
    documentType,
    title,
    url,
  });

  return NextResponse.json(document, { status: 201 });
}
