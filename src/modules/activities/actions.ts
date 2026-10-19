"use server";

import { revalidatePath } from "next/cache";
import { requireRole, scopeBarrio } from "@/modules/auth/session";
import { activitySchema, fieldError } from "@/modules/payments/schemas";
import { slugify } from "./labels";
import type { ActionResult } from "@/modules/auth/actions";

function pesosToCents(value: number): number {
  return Math.round(value * 100);
}

export async function saveActivity(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole(["admin"]);
  const parsed = activitySchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    description: formData.get("description"),
    ageGroup: formData.get("ageGroup"),
    scheduleLabel: formData.get("scheduleLabel"),
    weekday: formData.get("weekday") ?? "",
    startTime: formData.get("startTime") ?? "",
    endTime: formData.get("endTime") ?? "",
    location: formData.get("location"),
    capacity: formData.get("capacity"),
    pricePesos: formData.get("pricePesos"),
    billingFrequency: formData.get("billingFrequency"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { ok: false, error: fieldError(parsed.error) };
  const barrioId = ctx.barrioId;
  if (!parsed.data.id && !barrioId) return { ok: false, error: "Elegí un barrio antes de crear la actividad." };
  const weekday = parsed.data.weekday === "" ? null : Number(parsed.data.weekday);
  const payload = {
    name: parsed.data.name,
    description: parsed.data.description,
    age_group: parsed.data.ageGroup,
    schedule_label: parsed.data.scheduleLabel,
    weekday: weekday !== null && Number.isInteger(weekday) ? weekday : null,
    start_time: parsed.data.startTime || null,
    end_time: parsed.data.endTime || null,
    location: parsed.data.location,
    capacity: parsed.data.capacity,
    price_cents: pesosToCents(parsed.data.pricePesos),
    billing_frequency: parsed.data.billingFrequency,
    status: parsed.data.status,
  };
  const query = parsed.data.id
    ? scopeBarrio(ctx.supabase.from("activities").update(payload).eq("id", parsed.data.id), ctx.barrioId)
    : ctx.supabase.from("activities").insert({ ...payload, slug: slugify(parsed.data.name), barrio_id: barrioId ?? undefined });
  const { error } = await query;
  if (error) return { ok: false, error: "No pudimos guardar la actividad. Probá con otro nombre." };
  revalidatePath("/admin/actividades");
  revalidatePath("/actividades");
  return { ok: true, message: "Actividad guardada." };
}

export async function assignTeachers(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole(["admin"]);
  const activityId = String(formData.get("activityId") ?? "");
  const teacherIds = formData.getAll("teacherId").map(String).filter(Boolean);
  if (!activityId) return { ok: false, error: "Falta la actividad." };
  await ctx.supabase.from("activity_teachers").delete().eq("activity_id", activityId);
  if (teacherIds.length) {
    const { error } = await ctx.supabase
      .from("activity_teachers")
      .insert(teacherIds.map((teacherId) => ({ activity_id: activityId, teacher_id: teacherId })));
    if (error) return { ok: false, error: "No pudimos asignar a los profes." };
  }
  revalidatePath("/admin/actividades");
  return { ok: true, message: "Profes asignados." };
}
