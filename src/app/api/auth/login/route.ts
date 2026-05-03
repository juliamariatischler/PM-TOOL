import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const body = await req.json();
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unable to load user profile" }, { status: 500 });
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    color: user.color,
    createdAt: user.createdAt,
  });
}
