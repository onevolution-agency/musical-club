"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { ActionResult } from "@/modules/auth/actions";
import { requireRole } from "@/modules/auth/session";
import { CHILD_COOKIE, kidBirthOk } from "./domain";
import { canFollowChild, canManageChild } from "./session";
import { todayInArgentina } from "@/lib/time";

function knownError(message: string, fallback: string): string {
  const known = [
    "La edad tiene que ser de 6 a 12.",
    "Completá nombre y apellido.",
    "El mail no es válido.",
    "Ese mail ya tiene cuenta",
    "Ese mail es de un kid",
    "La contraseña tiene que tener 8 caracteres.",
    "Tiene que quedar un responsable",
    "No encontramos a ese chico",
    "No encontramos ese vínculo",
    "Ese responsable no tiene cuenta",
    "No autorizado",
    "La edad tiene que ser de 13 a 17.",
    "Ya lo sigue",
    "No está en ese barrio",
    "No podés quitar el seguimiento",
    "No encontramos ese pedido",
  ];
  return known.find((item) => message.includes(item)) ?? fallback;
}

async function assertChild(childId: string, admin: boolean) {
  const ctx = await requireRole(admin ? ["admin"] : ["student", "admin"]);
  const isAdmin = ctx.role === "admin" || ctx.role === "super_admin";
  if (!admin && !isAdmin && !(await canManageChild(ctx, childId))) {
    return { ctx, error: "No autorizado" as const };
  }
  return { ctx, error: null };
}

export async function chooseChild(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole(["student"]);
  const childId = String(formData.get("childId") ?? "");
  const jar = await cookies();
  if (childId === "yo") {
    jar.set(CHILD_COOKIE, "yo", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  } else if ((await canManageChild(ctx, childId)) || (await canFollowChild(ctx, childId))) {
    jar.set(CHILD_COOKIE, childId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  } else {
    return { ok: false, error: "No autorizado" };
  }
  revalidatePath("/alumno");
  return { ok: true, message: "Listo." };
}

export async function createChild(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole(["student"]);
  if (!ctx.barrioId) return { ok: false, error: "No hay barrio activo." };
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const birthDate = String(formData.get("birthDate") ?? "");
  if (!kidBirthOk(birthDate, todayInArgentina())) return { ok: false, error: "La edad tiene que ser de 6 a 12." };
  const { data, error } = await ctx.supabase.rpc("create_child", {
    first_name: firstName,
    last_name: lastName,
    birth_date: birthDate,
    barrio_id: ctx.barrioId,
    guardian_id: ctx.userId,
  });
  if (error || !data) return { ok: false, error: knownError(error?.message ?? "", "No pudimos agregar.") };
  const jar = await cookies();
  jar.set(CHILD_COOKIE, data, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/alumno");
  return { ok: true, message: "Listo." };
}

export async function createChildAsAdmin(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole(["admin"]);
  if (!ctx.barrioId) return { ok: false, error: "No hay barrio activo." };
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const birthDate = String(formData.get("birthDate") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!kidBirthOk(birthDate, todayInArgentina())) return { ok: false, error: "La edad tiene que ser de 6 a 12." };

  const { data, error } = await ctx.supabase.rpc("create_child", {
    first_name: firstName,
    last_name: lastName,
    birth_date: birthDate,
    barrio_id: ctx.barrioId,
    guardian_id: ctx.userId,
  });
  if (error || !data) return { ok: false, error: knownError(error?.message ?? "", "No pudimos agregar.") };

  if (email && email !== ctx.email.toLowerCase()) {
    const invited = await ctx.supabase.rpc("invite_guardian", { child_id: data, email });
    if (invited.error) return { ok: false, error: knownError(invited.error.message, "No pudimos invitar.") };
    const removed = await ctx.supabase.rpc("unlink_guardian", { child_id: data, guardian_id: ctx.userId });
    if (removed.error) return { ok: false, error: knownError(removed.error.message, "No pudimos vincular.") };
  }
  revalidatePath("/admin/alumnos");
  return { ok: true, message: "Listo." };
}

export async function updateChild(formData: FormData): Promise<ActionResult> {
  const childId = String(formData.get("childId") ?? "");
  const { ctx, error: denied } = await assertChild(childId, false);
  if (denied) return { ok: false, error: denied };
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const birthDate = String(formData.get("birthDate") ?? "");
  const { error } = await ctx.supabase.rpc("update_child", {
    child_id: childId,
    first_name: firstName,
    last_name: lastName,
    birth_date: birthDate,
  });
  if (error) return { ok: false, error: knownError(error.message, "No pudimos guardar.") };
  revalidatePath("/alumno/hijos");
  revalidatePath("/admin/alumnos");
  return { ok: true, message: "Listo." };
}

export async function inviteGuardian(formData: FormData): Promise<ActionResult> {
  const childId = String(formData.get("childId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const { ctx, error: denied } = await assertChild(childId, false);
  if (denied) return { ok: false, error: denied };
  const { error } = await ctx.supabase.rpc("invite_guardian", { child_id: childId, email });
  if (error) return { ok: false, error: knownError(error.message, "No pudimos invitar.") };
  revalidatePath("/alumno/hijos");
  revalidatePath("/admin/alumnos");
  return { ok: true, message: "Invitación enviada." };
}

export async function unlinkGuardian(formData: FormData): Promise<ActionResult> {
  const childId = String(formData.get("childId") ?? "");
  const guardianId = String(formData.get("guardianId") ?? "");
  const { ctx, error: denied } = await assertChild(childId, false);
  if (denied && ctx.userId !== guardianId) return { ok: false, error: denied };
  const { error } = await ctx.supabase.rpc("unlink_guardian", { child_id: childId, guardian_id: guardianId });
  if (error) return { ok: false, error: knownError(error.message, "No pudimos quitar.") };
  revalidatePath("/alumno/hijos");
  revalidatePath("/admin/alumnos");
  return { ok: true, message: "Responsable quitado." };
}

export async function releaseChild(formData: FormData): Promise<ActionResult> {
  const childId = String(formData.get("childId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const { ctx, error: denied } = await assertChild(childId, false);
  if (denied) return { ok: false, error: denied };
  const { error } = await ctx.supabase.rpc("release_child", { child_id: childId, email, password });
  if (error) return { ok: false, error: knownError(error.message, "No pudimos liberar.") };
  const jar = await cookies();
  if (jar.get(CHILD_COOKIE)?.value === childId) {
    jar.set(CHILD_COOKIE, "yo", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  revalidatePath("/alumno");
  revalidatePath("/admin/alumnos");
  return { ok: true, message: "Cuenta liberada." };
}
