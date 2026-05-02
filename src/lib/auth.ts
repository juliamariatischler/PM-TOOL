import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "pmtool_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function getAuthSecret() {
  return process.env.AUTH_SECRET || "pm-tool-dev-secret-change-me";
}

function encodeSessionPayload(payload: { userId: string; expiresAt: number }) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function signSessionValue(value: string) {
  return crypto.createHmac("sha256", getAuthSecret()).update(value).digest("base64url");
}

function serializeSession(payload: { userId: string; expiresAt: number }) {
  const value = encodeSessionPayload(payload);
  const signature = signSessionValue(value);
  return `${value}.${signature}`;
}

function parseSessionCookie(cookieValue: string) {
  const [value, signature] = cookieValue.split(".");
  if (!value || !signature) return null;

  const expectedSignature = signSessionValue(value);
  if (signature.length !== expectedSignature.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as {
      userId: string;
      expiresAt: number;
    };
    if (!payload.userId || !payload.expiresAt || payload.expiresAt < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(userId: string) {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, serializeSession({ userId, expiresAt }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const rawSession = cookieStore.get(SESSION_COOKIE)?.value;
  if (!rawSession) return null;

  const session = parseSessionCookie(rawSession);
  if (!session) return null;

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      color: true,
      createdAt: true,
    },
  }).then((user) => user ? { ...user, createdAt: user.createdAt.toISOString() } : null);
}

export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireApiSessionUser() {
  return getSessionUser();
}
