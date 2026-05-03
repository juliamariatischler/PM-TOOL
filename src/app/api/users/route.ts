import { NextResponse } from "next/server";
import { requireApiSessionUser } from "@/lib/auth";
import { createUser, listUsers } from "@/lib/data";

export async function GET() {
  if (!(await requireApiSessionUser())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const users = await listUsers();
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  if (!(await requireApiSessionUser())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const user = await createUser({
    name: body.name,
    email: body.email,
    color: body.color,
    avatar: body.avatar,
    password: body.password,
  });
  return NextResponse.json(user, { status: 201 });
}
