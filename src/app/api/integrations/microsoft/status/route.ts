import { NextResponse } from "next/server";
import { getMicrosoftConnectionStatus } from "@/lib/data";
import { requireApiSessionUser } from "@/lib/auth";
import { isMicrosoftConfigured } from "@/lib/microsoft";

export async function GET() {
  const user = await requireApiSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isMicrosoftConfigured()) {
    return NextResponse.json({
      connected: false,
      configured: false,
      email: null,
      expiresAt: null,
    });
  }

  const status = await getMicrosoftConnectionStatus(user.id);
  return NextResponse.json(status);
}
