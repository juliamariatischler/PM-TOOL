import { NextResponse } from "next/server";
import { requireApiSessionUser } from "@/lib/auth";
import { createUser, listUsers } from "@/lib/data";

export async function GET() {
  try {
    if (!(await requireApiSessionUser())) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const users = await listUsers();
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load users" },
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
    const user = await createUser({
      name: body.name,
      email: body.email,
      color: body.color,
      avatar: body.avatar,
      password: body.password,
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create user" },
      { status: 500 }
    );
  }
}
