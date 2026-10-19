import "server-only";

import type { MembershipRole, ProfileRow } from "@/lib/supabase/database.types";
import { scopeBarrio, type SessionContext } from "@/modules/auth/session";

export async function profilesInBarrio(ctx: SessionContext, roles: MembershipRole[], term = "") {
  let memberships = ctx.supabase.from("barrio_memberships").select("user_id, role, barrio_id").in("role", roles);
  memberships = scopeBarrio(memberships, ctx.barrioId);
  const { data: rows } = await memberships;
  const ids = [...new Set((rows ?? []).map((row) => row.user_id))];
  if (!ids.length) return [] as (ProfileRow & { membershipRole: MembershipRole })[];
  let profiles = ctx.supabase.from("profiles").select("*").in("id", ids).order("full_name");
  const clean = term.replace(/[%_,.()]/g, "").trim().slice(0, 60);
  if (clean) profiles = profiles.or(`full_name.ilike.%${clean}%,email.ilike.%${clean}%`);
  const { data } = await profiles;
  const roleByUser = new Map<string, MembershipRole>();
  for (const row of rows ?? []) {
    const current = roleByUser.get(row.user_id);
    if (!current || row.role === "admin") roleByUser.set(row.user_id, row.role);
  }
  return ((data ?? []) as ProfileRow[]).map((profile) => ({
    ...profile,
    membershipRole: roleByUser.get(profile.id) ?? "student",
  }));
}
