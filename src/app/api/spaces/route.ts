import { NextResponse } from "next/server";
import { requireApiSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!(await requireApiSessionUser())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const spaces = await prisma.space.findMany({
    orderBy: { position: "asc" },
    include: {
      folders: {
        orderBy: { position: "asc" },
        include: {
          projects: {
            orderBy: { position: "asc" },
            include: {
              tasks: {
                where: { parentId: null },
                orderBy: { position: "asc" },
                include: {
                  assignee: true,
                  subtasks: {
                    orderBy: { position: "asc" },
                    include: {
                      assignee: true,
                      subtasks: {
                        orderBy: { position: "asc" },
                        include: { assignee: true, subtasks: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  return NextResponse.json(spaces);
}

export async function POST(req: Request) {
  if (!(await requireApiSessionUser())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const space = await prisma.space.create({
    data: {
      name: body.name,
      color: body.color ?? "#00B050",
      icon: body.icon ?? null,
      position: body.position ?? 0,
    },
    include: { folders: true },
  });
  return NextResponse.json(space, { status: 201 });
}
