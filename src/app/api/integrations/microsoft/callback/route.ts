import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { upsertMicrosoftConnection } from "@/lib/data";
import {
  exchangeMicrosoftCodeForToken,
  fetchMicrosoftProfile,
  isMicrosoftConfigured,
} from "@/lib/microsoft";

export async function GET(req: Request) {
  const user = await getSessionUser();
  const url = new URL(req.url);

  if (!user) {
    return NextResponse.redirect(new URL("/login", url));
  }

  if (!isMicrosoftConfigured()) {
    return NextResponse.redirect(new URL("/?microsoft=not-configured", url));
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("pmtool_microsoft_oauth_state")?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/?microsoft=invalid-state", url));
  }

  cookieStore.delete("pmtool_microsoft_oauth_state");

  try {
    const token = await exchangeMicrosoftCodeForToken(code);
    const profile = await fetchMicrosoftProfile(token.access_token);
    const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();

    await upsertMicrosoftConnection({
      userId: user.id,
      email: profile.email,
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? null,
      expiresAt,
      driveId: profile.driveId,
    });

    return NextResponse.redirect(new URL("/?microsoft=connected", url));
  } catch {
    return NextResponse.redirect(new URL("/?microsoft=error", url));
  }
}
