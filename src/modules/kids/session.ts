import "server-only";

import { cookies } from "next/headers";
import type { GuardianAccess, ProfileRow } from "@/lib/supabase/database.types";
import type { SessionContext } from "@/modules/auth/session";
import { CHILD_COOKIE, resolveActiveStudent } from "./domain";

export async function linkedChildren(ctx: SessionContext): Promise<(ProfileRow & { access: GuardianAccess })[]> {
  let query = ctx.supabase.from("guardianships").select("child_id, barrio_id, access").eq("guardian_id", ctx.userId);
  if (ctx.barrioId) query = query.eq("barrio_id", ctx.barrioId);
  const { data } = await query;
  const accessByChild = new Map<string, GuardianAccess>();
  for (const row of data ?? []) {
    const current = accessByChild.get(row.child_id);
    if (!current || row.access === "manager") accessByChild.set(row.child_id, row.access);
  }
  const ids = [...accessByChild.keys()];
  if (!ids.length) return [];
  const { data: profiles } = await ctx.supabase.from("profiles").select("*").in("id", ids).order("full_name");
  return ((profiles ?? []) as ProfileRow[]).map((profile) => ({
    ...profile,
    access: accessByChild.get(profile.id) ?? "contact",
  }));
}

export async function managedChildren(ctx: SessionContext): Promise<ProfileRow[]> {
  const linked = await linkedChildren(ctx);
  return linked.filter((child) => child.access === "manager" && child.account_kind === "kid");
}

export async function canManageChild(ctx: SessionContext, childId: string): Promise<boolean> {
  if (!childId || childId === ctx.userId) return false;
  const { data } = await ctx.supabase
    .from("guardianships")
    .select("child_id")
    .eq("guardian_id", ctx.userId)
    .eq("child_id", childId)
    .eq("access", "manager")
    .maybeSingle();
  return Boolean(data);
}

export async function activeStudent(ctx: SessionContext): Promise<{
  id: string;
  profile: ProfileRow;
  self: boolean;
  children: ProfileRow[];
}> {
  const children = await managedChildren(ctx);
  const jar = await cookies();
  const chosen = resolveActiveStudent(
    jar.get(CHILD_COOKIE)?.value,
    ctx.userId,
    children.map((child) => child.id),
  );
  const profile = chosen.self ? ctx.profile : (children.find((child) => child.id === chosen.id) ?? ctx.profile);
  return { id: profile.id, profile, self: chosen.self || profile.id === ctx.userId, children };
}
