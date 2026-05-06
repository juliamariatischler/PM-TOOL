import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { SetupError } from "@/components/SetupError";
import { getSessionUser } from "@/lib/auth";
import { getMissingSupabaseEnv } from "@/lib/supabase/env";

export default async function Home() {
  const missingEnv = getMissingSupabaseEnv();
  if (missingEnv.length > 0) {
    return <SetupError missingEnv={missingEnv} />;
  }

  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return <AppShell currentUser={user} />;
}
