"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/modules/auth/actions";
import { requireRole } from "@/modules/auth/session";

function knownError(message: string, fallback: string): string {
  const known = [
    "La edad tiene que ser de 13 a 17.",
    "El mail no es válido.",
    "Ya lo sigue",
    "No está en ese barrio",
    "No podés quitar el seguimiento",
    "No encontramos ese pedido",
    "No encontramos ese vínculo",
    "No encontramos a ese adolescente",
    "Ese responsable no tiene cuenta",
    "No autorizado",
  ];
  return known.find((item) => message.includes(item)) ?? fallback;
}

function refresh() {
  revalidatePath("/alumno");
  revalidatePath("/admin/alumnos");
}

export async function inviteFollower(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole(["student"]);
  if (!ctx.barrioId) return { ok: false, error: "No hay barrio activo." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const { error } = await ctx.supabase.rpc("invite_follower", { email, barrio_id: ctx.barrioId });
  if (error) return { ok: false, error: knownError(error.message, "No pudimos invitar.") };
  refresh();
  return { ok: true, message: "Invitación enviada." };
}

export async function requestFollow(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole(["student"]);
  if (!ctx.barrioId) return { ok: false, error: "No hay barrio activo." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const { error } = await ctx.supabase.rpc("request_follow", { email, barrio_id: ctx.barrioId });
  if (error) return { ok: false, error: knownError(error.message, "No pudimos pedir el seguimiento.") };
  refresh();
  return { ok: true, message: "Pedido enviado." };
}

export async function resolveFollow(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole(["student"]);
  const requestId = String(formData.get("requestId") ?? "");
  const accept = String(formData.get("accept") ?? "") === "si";
  const { error } = await ctx.supabase.rpc("resolve_follow", { request_id: requestId, accept });
  if (error) return { ok: false, error: knownError(error.message, "No pudimos responder.") };
  refresh();
  return { ok: true, message: accept ? "Seguimiento activo." : "Pedido rechazado." };
}

export async function endFollow(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole(["student", "admin"]);
  const childId = String(formData.get("childId") ?? "");
  const guardianId = String(formData.get("guardianId") ?? "");
  const { error } = await ctx.supabase.rpc("end_follow", { child_id: childId, guardian_id: guardianId });
  if (error) return { ok: false, error: knownError(error.message, "No pudimos quitarlo.") };
  refresh();
  return { ok: true, message: "Seguimiento cerrado." };
}

export async function adminLinkFollow(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole(["admin"]);
  if (!ctx.barrioId) return { ok: false, error: "No hay barrio activo." };
  const teenId = String(formData.get("teenId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const { error } = await ctx.supabase.rpc("admin_link_follow", {
    teen_id: teenId,
    email,
    barrio_id: ctx.barrioId,
  });
  if (error) return { ok: false, error: knownError(error.message, "No pudimos vincular.") };
  refresh();
  return { ok: true, message: "Seguimiento activo." };
}

export async function setFollowNotify(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole(["student"]);
  const childId = String(formData.get("childId") ?? "");
  const enabled = formData.get("enabled") === "on" || formData.get("enabled") === "si";
  const { error } = await ctx.supabase.rpc("set_follow_notify", { child_id: childId, enabled });
  if (error) return { ok: false, error: knownError(error.message, "No pudimos guardar.") };
  refresh();
  return { ok: true, message: "Listo." };
}

export async function markNoticeRead(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole(["student"]);
  const noticeId = String(formData.get("noticeId") ?? "");
  const { error } = await ctx.supabase.rpc("mark_notice_read", { notice_id: noticeId });
  if (error) return { ok: false, error: "No pudimos marcar el aviso." };
  revalidatePath("/alumno");
  return { ok: true, message: "Listo." };
}
