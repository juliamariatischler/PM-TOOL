import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { SetupError } from "@/components/SetupError";
import { getMissingSupabaseEnv } from "@/lib/supabase/env";

export default async function LoginPage() {
  const missingEnv = getMissingSupabaseEnv();
  if (missingEnv.length > 0) {
    return <SetupError missingEnv={missingEnv} />;
  }

  const user = await getSessionUser();
  if (user) {
    redirect("/");
  }

  return <LoginForm />;
}
