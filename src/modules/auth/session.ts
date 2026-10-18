import "server-only";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow, Role } from "@/lib/supabase/database.types";

export function homeFor(role: Role): string {
  if (role === "admin") return "/admin";
  if (role === "teacher") return "/profesor";
  return "/alumno";
}

export function safeNext(value: string | null | undefined, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}

export async function getSessionContext() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (!profile) return null;
  return {
    supabase,
    userId,
    email: (typeof data.claims.email === "string" ? data.claims.email : profile.email) ?? "",
    profile: profile as ProfileRow,
  };
}

export async function requireRole(roles: Role[]) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/ingresar");
  if (!roles.includes(ctx.profile.role)) redirect(homeFor(ctx.profile.role));
  return ctx;
}
