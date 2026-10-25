import "server-only";

import { cookies } from "next/headers";
import type { GuardianAccess, ProfileRow } from "@/lib/supabase/database.types";
import type { SessionContext } from "@/modules/auth/session";
import { CHILD_COOKIE, resolveActiveStudent } from "./domain";

export type WatchedChild = ProfileRow & { access: GuardianAccess; notify: boolean };

function watchMode(child: WatchedChild): "kid" | "follow" | "contact" {
  if (child.access === "manager" && child.account_kind === "kid") return "kid";
  if (child.access === "follow") return "follow";
  return "contact";
}

export async function linkedChildren(ctx: SessionContext): Promise<WatchedChild[]> {
  await ctx.supabase.rpc("refresh_follow_notices");
  let query = ctx.supabase
    .from("guardianships")
    .select("child_id, barrio_id, access, ended_at, notify")
    .eq("guardian_id", ctx.userId);
  if (ctx.barrioId) query = query.eq("barrio_id", ctx.barrioId);
  const { data } = await query;
  const accessByChild = new Map<string, { access: GuardianAccess; notify: boolean }>();
  for (const row of data ?? []) {
    if (row.access === "follow" && row.ended_at) continue;
    const current = accessByChild.get(row.child_id);
    if (!current || row.access === "manager") accessByChild.set(row.child_id, { access: row.access, notify: row.notify });
  }
  const ids = [...accessByChild.keys()];
  if (!ids.length) return [];
  const { data: profiles } = await ctx.supabase.from("profiles").select("*").in("id", ids).order("full_name");
  return ((profiles ?? []) as ProfileRow[]).flatMap((profile) => {
    const link = accessByChild.get(profile.id);
    if (!link) return [];
    if (link.access === "follow" && profile.account_kind !== "user") return [];
    return [{ ...profile, access: link.access, notify: link.notify }];
  });
}

export async function managedChildren(ctx: SessionContext): Promise<ProfileRow[]> {
  const linked = await linkedChildren(ctx);
  return linked.filter((child) => child.access === "manager" && child.account_kind === "kid");
}

export async function canFollowChild(ctx: SessionContext, childId: string): Promise<boolean> {
  if (!childId || childId === ctx.userId) return false;
  const { data } = await ctx.supabase
    .from("guardianships")
    .select("child_id")
    .eq("guardian_id", ctx.userId)
    .eq("child_id", childId)
    .eq("access", "follow")
    .is("ended_at", null)
    .maybeSingle();
  return Boolean(data);
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
  mode: "self" | "kid" | "follow";
  children: WatchedChild[];
}> {
  const linked = await linkedChildren(ctx);
  const children = linked.filter((child) => watchMode(child) === "kid" || watchMode(child) === "follow");
  const ordered = [
    ...children.filter((child) => watchMode(child) === "kid"),
    ...children.filter((child) => watchMode(child) === "follow"),
  ];
  const jar = await cookies();
  const chosen = resolveActiveStudent(
    jar.get(CHILD_COOKIE)?.value,
    ctx.userId,
    ordered.map((child) => child.id),
  );
  const watched = ordered.find((child) => child.id === chosen.id);
  const mode = watched ? watchMode(watched) : "contact";
  if (!watched || chosen.self || mode === "contact") {
    return { id: ctx.profile.id, profile: ctx.profile, self: true, mode: "self", children: ordered };
  }
  return { id: watched.id, profile: watched, self: false, mode, children: ordered };
}
