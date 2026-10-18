import "server-only";

import { createClient } from "@supabase/supabase-js";
import { serviceRoleKey, supabaseUrl } from "@/lib/env";
import type { Database } from "./database.types";

export function createAdminClient() {
  const url = supabaseUrl();
  const key = serviceRoleKey();
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
