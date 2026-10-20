import "server-only";

import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/env";
import type { BarrioRow } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/modules/auth/session";
import { activePublicSlug, ALL_BARRIOS, BARRIO_COOKIE } from "./domain";

export async function listPublicBarrios(): Promise<BarrioRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("barrios").select("*").eq("active", true).order("name");
    return (data ?? []) as BarrioRow[];
  } catch {
    return [];
  }
}

export async function publicBarrioSlug(): Promise<string | null> {
  const session = await getSessionContext();
  const jar = await cookies();
  const cookie = jar.get(BARRIO_COOKIE)?.value ?? null;
  if (session?.barrio?.slug || (cookie && cookie !== ALL_BARRIOS)) {
    return activePublicSlug(cookie, session?.barrio?.slug, []);
  }
  const barrios = await listPublicBarrios();
  return activePublicSlug(cookie, null, barrios.map((barrio) => barrio.slug));
}
