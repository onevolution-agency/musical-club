"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/modules/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayInArgentina } from "@/lib/time";
import { feesToVoidOnCancel, canEnroll } from "./domain";
import type { ActionResult } from "@/modules/auth/actions";
import type { EnrollmentStatus } from "@/lib/supabase/database.types";

export async function enrollSelf(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole(["student"]);
  const activityId = String(formData.get("activityId") ?? "");
  if (!activityId) return { ok: false, error: "Falta la actividad." };
  const { data: activity } = await ctx.supabase.from("activities").select("*").eq("id", activityId).maybeSingle();
  if (!activity || activity.status !== "active") return { ok: false, error: "Esa actividad no está abierta." };
  if (!ctx.memberships.some((row) => row.barrio_id === activity.barrio_id && row.role === "student")) {
    return { ok: false, error: "Esta actividad es de otro barrio." };
  }

  const { count } = await ctx.supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("activity_id", activityId)
    .in("status", ["active", "pending"]);
  const occupied = count ?? 0;
  const { data: existing } = await ctx.supabase
    .from("enrollments")
    .select("*")
    .eq("activity_id", activityId)
    .eq("student_id", ctx.userId)
    .maybeSingle();

  if (existing && (existing.status === "active" || existing.status === "pending")) {
    return { ok: true, message: "Ya estás inscripto." };
  }
  const nextStatus = canEnroll(occupied, activity.capacity) ? "active" : "waitlist";
  if (existing) {
    const admin = createAdminClient();
    const client = admin ?? ctx.supabase;
    const { error } = await client
      .from("enrollments")
      .update({ status: nextStatus, starts_on: todayInArgentina() })
      .eq("id", existing.id);
    if (error) return { ok: false, error: "No pudimos reactivar la inscripción." };
  } else {
    const { error } = await ctx.supabase.from("enrollments").insert({
      activity_id: activityId,
      student_id: ctx.userId,
      status: nextStatus,
      starts_on: todayInArgentina(),
    });
    if (error) return { ok: false, error: error.message.includes("cupo") ? "No queda cupo." : "No pudimos inscribirte." };
  }
  revalidatePath("/alumno");
  return {
    ok: true,
    message: nextStatus === "waitlist" ? "El cupo está lleno. Quedaste en lista de espera." : "Inscripción lista.",
  };
}

export async function cancelEnrollment(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole(["student", "admin"]);
  const enrollmentId = String(formData.get("enrollmentId") ?? "");
  const { data: enrollment } = await ctx.supabase.from("enrollments").select("*").eq("id", enrollmentId).maybeSingle();
  if (!enrollment) return { ok: false, error: "No encontramos la inscripción." };
  if (ctx.profile.role !== "admin" && enrollment.student_id !== ctx.userId) {
    return { ok: false, error: "Esa inscripción no es tuya." };
  }
  const { error } = await ctx.supabase.from("enrollments").update({ status: "cancelled" }).eq("id", enrollmentId);
  if (error) return { ok: false, error: "No pudimos cancelar." };

  const admin = createAdminClient();
  if (admin && ctx.profile.role === "admin") {
    const { data: fees } = await admin.from("fees").select("id, status").eq("enrollment_id", enrollmentId);
    const { data: payments } = await admin
      .from("payments")
      .select("fee_id, status")
      .in("fee_id", (fees ?? []).map((fee) => fee.id).concat("00000000-0000-0000-0000-000000000000"));
    const voidIds = feesToVoidOnCancel(fees ?? [], (payments ?? []).map((payment) => ({ feeId: payment.fee_id, status: payment.status })));
    if (voidIds.length) {
      await admin.from("fees").update({ status: "void" }).in("id", voidIds);
    }
  }
  revalidatePath("/alumno");
  revalidatePath("/admin/inscripciones");
  return { ok: true, message: "Inscripción cancelada." };
}

export async function adminEnroll(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole(["admin"]);
  const activityId = String(formData.get("activityId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const startsOn = String(formData.get("startsOn") ?? todayInArgentina());
  if (!activityId || !studentId) return { ok: false, error: "Elegí alumno y actividad." };
  const { data: existing } = await ctx.supabase
    .from("enrollments")
    .select("id")
    .eq("activity_id", activityId)
    .eq("student_id", studentId)
    .maybeSingle();
  const write = existing
    ? ctx.supabase.from("enrollments").update({ status: "active", starts_on: startsOn }).eq("id", existing.id)
    : ctx.supabase.from("enrollments").insert({
        activity_id: activityId,
        student_id: studentId,
        status: "active",
        starts_on: startsOn,
      });
  const { error } = await write;
  if (error) return { ok: false, error: error.message.includes("cupo") ? "No queda cupo." : "No pudimos inscribir." };
  revalidatePath("/admin/inscripciones");
  return { ok: true, message: "Inscripción guardada." };
}

export async function setEnrollmentStatus(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole(["admin"]);
  const id = String(formData.get("enrollmentId") ?? "");
  const status = String(formData.get("status") ?? "") as EnrollmentStatus;
  if (!["pending", "active", "waitlist", "cancelled", "completed"].includes(status)) {
    return { ok: false, error: "Estado inválido." };
  }
  const { error } = await ctx.supabase.from("enrollments").update({ status }).eq("id", id);
  if (error) return { ok: false, error: "No pudimos cambiar el estado." };
  revalidatePath("/admin/inscripciones");
  return { ok: true, message: "Estado actualizado." };
}
