import "server-only";

import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/env";
import type { BarrioRow } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { BARRIO_COOKIE } from "./domain";

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
  const jar = await cookies();
  const value = jar.get(BARRIO_COOKIE)?.value;
  if (!value || value === "todos") return null;
  return value;
}
