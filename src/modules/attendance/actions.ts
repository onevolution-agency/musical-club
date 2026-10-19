"use server";

import { revalidatePath } from "next/cache";
import { attendanceSecret } from "@/lib/env";
import { requireRole } from "@/modules/auth/session";
import type { ActionResult } from "@/modules/auth/actions";
import { attendanceMessage, evaluateAttendance, verifyStudentQr } from "./domain";

export type ScanResult =
  | { ok: true; studentId: string; message: string; avatarUrl: string | null }
  | { ok: false; code: string; message: string };

async function mark(sessionId: string, studentId: string, method: "qr" | "manual"): Promise<ScanResult> {
  const ctx = await requireRole(["teacher", "admin"]);
  const { data: session } = await ctx.supabase.from("class_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (!session) return { ok: false, code: "closed", message: "No encontramos la clase." };
  const { data: enrollment } = await ctx.supabase
    .from("enrollments")
    .select("id, activity_id, status")
    .eq("activity_id", session.activity_id)
    .eq("student_id", studentId)
    .maybeSingle();
  const { data: existing } = await ctx.supabase
    .from("attendance_marks")
    .select("id")
    .eq("session_id", sessionId)
    .eq("student_id", studentId)
    .maybeSingle();
  const decision = evaluateAttendance({
    studentId,
    sessionStatus: session.status,
    sessionActivityId: session.activity_id,
    enrollment: enrollment ? { activityId: enrollment.activity_id, status: enrollment.status } : null,
    alreadyMarked: Boolean(existing),
  });
  const { data: profile } = await ctx.supabase.from("profiles").select("full_name, avatar_url").eq("id", studentId).maybeSingle();
  if (!decision.ok) {
    return { ok: false, code: decision.code, message: attendanceMessage(decision.code, profile?.full_name || undefined) };
  }
  const { error } = await ctx.supabase.from("attendance_marks").insert({
    session_id: sessionId,
    student_id: studentId,
    enrollment_id: enrollment?.id ?? null,
    method,
    marked_by: ctx.userId,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, code: "duplicate", message: attendanceMessage("duplicate", profile?.full_name || undefined) };
    }
    return { ok: false, code: "invalid_qr", message: "No pudimos guardar la asistencia." };
  }
  revalidatePath(`/profesor/sesion/${sessionId}`);
  return {
    ok: true,
    studentId,
    avatarUrl: profile?.avatar_url ?? null,
    message: `${profile?.full_name || "Alumno"} está presente.`,
  };
}

export async function scanAttendance(sessionId: string, token: string): Promise<ScanResult> {
  const secret = attendanceSecret();
  if (!secret) return { ok: false, code: "invalid_qr", message: "Falta ATTENDANCE_QR_SECRET en el servidor." };
  const studentId = verifyStudentQr(token, secret);
  if (!studentId) return { ok: false, code: "invalid_qr", message: attendanceMessage("invalid_qr") };
  return mark(sessionId, studentId, "qr");
}

export async function markManual(formData: FormData): Promise<ActionResult> {
  const result = await mark(String(formData.get("sessionId") ?? ""), String(formData.get("studentId") ?? ""), "manual");
  return result.ok ? { ok: true, message: result.message } : { ok: false, error: result.message };
}

export async function openSession(formData: FormData): Promise<void> {
  const ctx = await requireRole(["teacher", "admin"]);
  const activityId = String(formData.get("activityId") ?? "");
  const { data: open } = await ctx.supabase
    .from("class_sessions")
    .select("id")
    .eq("activity_id", activityId)
    .eq("status", "open")
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (open) {
    const { redirect } = await import("next/navigation");
    redirect(`/profesor/sesion/${open.id}`);
  }
  const { data, error } = await ctx.supabase
    .from("class_sessions")
    .insert({ activity_id: activityId, opened_by: ctx.userId, status: "open" })
    .select("id")
    .single();
  if (error || !data) throw new Error("No pudimos abrir la clase.");
  const { redirect } = await import("next/navigation");
  redirect(`/profesor/sesion/${data.id}`);
}

export async function closeSession(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole(["teacher", "admin"]);
  const sessionId = String(formData.get("sessionId") ?? "");
  const { error } = await ctx.supabase
    .from("class_sessions")
    .update({ status: "closed", ends_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) return { ok: false, error: "No pudimos cerrar la clase." };
  revalidatePath("/profesor");
  return { ok: true, message: "Clase cerrada." };
}
