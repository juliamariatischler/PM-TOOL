import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireApiSessionUser } from "@/lib/auth";
import { buildMicrosoftAuthUrl, isMicrosoftConfigured } from "@/lib/microsoft";

export async function GET() {
  const user = await requireApiSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isMicrosoftConfigured()) {
    return NextResponse.json({ error: "microsoft integration is not configured" }, { status: 400 });
  }

  const state = randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("pmtool_microsoft_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return NextResponse.redirect(buildMicrosoftAuthUrl(state));
}
