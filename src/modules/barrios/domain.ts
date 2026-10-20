import type { MembershipRole, Role } from "@/lib/supabase/database.types";

export const BARRIO_COOKIE = "mc_barrio";
export const ALL_BARRIOS = "todos";

export const EL_TALAR_ID = "b1000000-0000-4000-8000-000000000001";
export const NORDELTA_ID = "b1000000-0000-4000-8000-000000000002";

export type BarrioRef = { id: string; slug: string; name?: string };
export type MembershipRef = { barrio_id: string; role: MembershipRole };

export function isAdminRole(role: Role): boolean {
  return role === "admin" || role === "super_admin";
}

export function roleAllows(actual: Role, allowed: Role[]): boolean {
  if (allowed.includes(actual)) return true;
  return actual === "super_admin" && allowed.includes("admin");
}

export function homeForRole(role: Role): string {
  if (role === "admin" || role === "super_admin") return "/admin";
  if (role === "teacher") return "/profesor";
  return "/alumno";
}

function barrioFromProfile(currentBarrioId: string | null, barrios: BarrioRef[]): string | null {
  if (currentBarrioId && barrios.some((barrio) => barrio.id === currentBarrioId)) return currentBarrioId;
  return barrios[0]?.id ?? currentBarrioId;
}

export function resolveBarrio(input: {
  profileRole: Role;
  cookie: string | null;
  currentBarrioId: string | null;
  memberships: MembershipRef[];
  barrios: BarrioRef[];
}): { role: Role; barrioId: string | null } {
  const fromCookie =
    input.cookie && input.cookie !== ALL_BARRIOS
      ? input.barrios.find((barrio) => barrio.slug === input.cookie)
      : undefined;

  if (input.profileRole === "super_admin") {
    return { role: "super_admin", barrioId: fromCookie?.id ?? barrioFromProfile(input.currentBarrioId, input.barrios) };
  }

  const cookieMembership = fromCookie
    ? input.memberships.find((row) => row.barrio_id === fromCookie.id)
    : undefined;
  const membership =
    cookieMembership ??
    input.memberships.find((row) => row.barrio_id === input.currentBarrioId) ??
    input.memberships[0];

  if (membership) return { role: membership.role, barrioId: membership.barrio_id };
  return { role: input.profileRole, barrioId: barrioFromProfile(input.currentBarrioId, input.barrios) };
}

export function activePublicSlug(
  cookie: string | null | undefined,
  userSlug: string | null | undefined,
  availableSlugs: readonly string[],
): string | null {
  if (userSlug) return userSlug;
  if (cookie && cookie !== ALL_BARRIOS) return cookie;
  return availableSlugs[0] ?? null;
}

export function slugifyBarrio(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}
