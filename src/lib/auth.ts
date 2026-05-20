import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SessionProfile = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  color: string;
  created_at: string;
};

export async function clearSession() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}

export async function getSessionUser() {
  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return null;
  }

  let user: { id: string; email?: string; created_at: string; user_metadata?: Record<string, unknown> } | null = null;
  try {
    const result = await supabase.auth.getUser();
    if (result.error || !result.data.user) return null;
    user = result.data.user;
  } catch {
    return null;
  }

  try {
    const admin = getSupabaseAdminClient();
    const { data: profile } = await admin
      .from("users")
      .select("id, name, email, avatar, color, created_at")
      .eq("id", user.id)
      .maybeSingle<SessionProfile>();

    if (profile) {
      return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar,
        color: profile.color,
        createdAt: profile.created_at,
      };
    }
  } catch {
    // Allow auth-only login flows to continue even if the service-role env is missing locally.
  }

  return {
    id: user.id,
    name:
      typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()
        ? user.user_metadata.name
        : user.email?.split("@")[0] ?? "User",
    email: user.email ?? "",
    avatar: null,
    color: "#6366f1",
    createdAt: user.created_at,
  };
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
