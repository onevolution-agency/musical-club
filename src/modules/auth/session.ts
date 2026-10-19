import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { BarrioRow, MembershipRow, ProfileRow, Role } from "@/lib/supabase/database.types";
import { BARRIO_COOKIE, homeForRole, resolveBarrio, roleAllows } from "@/modules/barrios/domain";

export type SessionContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  email: string;
  profile: ProfileRow;
  role: Role;
  barrioId: string | null;
  barrio: BarrioRow | null;
  memberships: MembershipRow[];
  barrios: BarrioRow[];
};

export function homeFor(role: Role): string {
  return homeForRole(role);
}

export function safeNext(value: string | null | undefined, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}

export function scopeBarrio<T extends { eq: (column: string, value: string) => T }>(query: T, barrioId: string | null): T {
  return barrioId ? query.eq("barrio_id", barrioId) : query;
}

export async function getSessionContext(): Promise<SessionContext | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (!profile) return null;
  const typed = profile as ProfileRow;
  const { data: membershipRows } = await supabase.from("barrio_memberships").select("*").eq("user_id", userId);
  const memberships = (membershipRows ?? []) as MembershipRow[];
  let barrioQuery = supabase.from("barrios").select("*").order("name");
  if (typed.role !== "super_admin") {
    const ids = memberships.map((row) => row.barrio_id);
    barrioQuery = ids.length ? barrioQuery.in("id", ids) : barrioQuery.eq("id", "00000000-0000-0000-0000-000000000000");
  }
  const { data: barrioRows } = await barrioQuery;
  const barrios = (barrioRows ?? []) as BarrioRow[];
  const jar = await cookies();
  const cookie = jar.get(BARRIO_COOKIE)?.value ?? null;
  const resolved = resolveBarrio({
    profileRole: typed.role,
    cookie,
    currentBarrioId: typed.current_barrio_id,
    memberships,
    barrios,
  });
  return {
    supabase,
    userId,
    email: (typeof data.claims.email === "string" ? data.claims.email : typed.email) ?? "",
    profile: typed,
    role: resolved.role,
    barrioId: resolved.barrioId,
    barrio: barrios.find((barrio) => barrio.id === resolved.barrioId) ?? null,
    memberships,
    barrios,
  };
}

export async function requireRole(roles: Role[]) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/ingresar");
  if (!roleAllows(ctx.role, roles)) redirect(homeFor(ctx.role));
  return ctx;
}
