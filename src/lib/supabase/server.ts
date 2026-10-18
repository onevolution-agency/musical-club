import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";
import type { Database } from "./database.types";

export async function createClient() {
  const url = supabaseUrl();
  const key = supabasePublishableKey();
  if (!url || !key) {
    throw new Error("Supabase no está configurado.");
  }
  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // En un Server Component las cookies las refresca src/proxy.ts.
        }
      },
    },
  });
}
