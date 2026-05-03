import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/supabase/env";

// The admin client intentionally stays loosely typed until generated DB types are added.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let adminClient: ReturnType<typeof createClient<any>> | null = null;

export function getSupabaseAdminClient() {
  if (!adminClient) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adminClient = createClient<any>(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}
