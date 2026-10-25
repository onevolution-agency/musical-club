"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { isLocalSite, mercadoPagoToken, siteUrl } from "@/lib/env";
import { todayInArgentina } from "@/lib/time";
import { requireRole } from "@/modules/auth/session";
import { canManageChild } from "@/modules/kids/session";
import type { ActionResult } from "@/modules/auth/actions";
import type { FeeRow, FeeStatus, PaymentRow } from "@/lib/supabase/database.types";
import {
  DomainError,
  missingPeriods,
  periodsForEnrollment,
  pesosToCents,
  registerCashPayment,
  remainingCents,
  voidPayment,
  type FeeSnapshot,
  type PaymentSnapshot,
} from "./domain";
import { createCheckoutPreference } from "./mercadopago";
import { cashPaymentSchema, fieldError, voidPaymentSchema } from "./schemas";

function toSnapshot(fee: FeeRow): FeeSnapshot {
  return { id: fee.id, amountCents: fee.amount_cents, dueDate: fee.due_date, status: fee.status };
}

function toPayment(payment: PaymentRow): PaymentSnapshot {
  return {
    id: payment.id,
    feeId: payment.fee_id,
    amountCents: payment.amount_cents,
    method: payment.method,
    status: payment.status,
    externalId: payment.mp_payment_id,
    receivedBy: payment.received_by,
  };
}

export async function generateFees(formData?: FormData): Promise<ActionResult> {
  const ctx = await requireRole(["admin"]);
  const until = String(formData?.get("until") ?? todayInArgentina());
  const admin = createAdminClient() ?? ctx.supabase;
  let enrollmentQuery = admin
    .from("enrollments")
    .select("id, student_id, activity_id, starts_on, status, barrio_id")
    .eq("status", "active");
  if (ctx.barrioId) enrollmentQuery = enrollmentQuery.eq("barrio_id", ctx.barrioId);
  const { data: enrollments } = await enrollmentQuery;
  const { data: activities } = await admin.from("activities").select("id, price_cents, billing_frequency, name");
  const activityMap = new Map((activities ?? []).map((activity) => [activity.id, activity]));
  const { data: existing } = await admin.from("fees").select("enrollment_id, period_start");
  const existingByEnrollment = new Map<string, string[]>();
  for (const fee of existing ?? []) {
    const list = existingByEnrollment.get(fee.enrollment_id) ?? [];
    list.push(fee.period_start);
    existingByEnrollment.set(fee.enrollment_id, list);
  }
  const rows: {
    enrollment_id: string;
    student_id: string;
    activity_id: string;
    period_start: string;
    period_end: string;
    due_date: string;
    amount_cents: number;
    billing_frequency: FeeRow["billing_frequency"];
    status: FeeStatus;
  }[] = [];
  for (const enrollment of enrollments ?? []) {
    const activity = activityMap.get(enrollment.activity_id);
    if (!activity || activity.price_cents <= 0) continue;
    const periods = missingPeriods(
      existingByEnrollment.get(enrollment.id) ?? [],
      periodsForEnrollment({
        startsOn: enrollment.starts_on,
        frequency: activity.billing_frequency,
        until,
      }),
    );
    for (const period of periods) {
      rows.push({
        enrollment_id: enrollment.id,
        student_id: enrollment.student_id,
        activity_id: enrollment.activity_id,
        period_start: period.periodStart,
        period_end: period.periodEnd,
        due_date: period.dueDate,
        amount_cents: activity.price_cents,
        billing_frequency: activity.billing_frequency,
        status: period.dueDate < todayInArgentina() ? "overdue" : "pending",
      });
    }
  }
  if (!rows.length) return { ok: true, message: "No hay cuotas nuevas." };
  const { error } = await admin.from("fees").insert(rows);
  if (error) return { ok: false, error: "No pudimos generar las cuotas." };
  revalidatePath("/admin/cuotas");
  revalidatePath("/alumno/cuotas");
  return { ok: true, message: `Generamos ${rows.length} cuota${rows.length === 1 ? "" : "s"}.` };
}

export async function registerCash(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole(["admin"]);
  const parsed = cashPaymentSchema.safeParse({
    feeId: formData.get("feeId"),
    amountPesos: formData.get("amountPesos"),
    paidOn: formData.get("paidOn"),
    receiptNumber: formData.get("receiptNumber") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { ok: false, error: fieldError(parsed.error) };
  const { data: fee } = await ctx.supabase.from("fees").select("*").eq("id", parsed.data.feeId).maybeSingle();
  if (!fee) return { ok: false, error: "No encontramos la cuota." };
  const { data: payments } = await ctx.supabase.from("payments").select("*").eq("fee_id", fee.id);
  let cents = 0;
  try {
    cents = pesosToCents(parsed.data.amountPesos);
    registerCashPayment(
      { fee: toSnapshot(fee), payments: (payments ?? []).map(toPayment) },
      { id: ctx.userId, role: "admin" },
      {
        amountCents: cents,
        paidOn: parsed.data.paidOn,
        today: todayInArgentina(),
        note: parsed.data.note,
        receiptNumber: parsed.data.receiptNumber,
      },
    );
  } catch (error) {
    return { ok: false, error: error instanceof DomainError ? error.message : "No pudimos registrar el efectivo." };
  }

  const paymentId = randomUUID();
  let receiptPath: string | null = null;
  const file = formData.get("receipt");
  if (file instanceof File && file.size > 0) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type) || file.size > 5_000_000) {
      return { ok: false, error: "Usá JPG, PNG, WEBP o PDF de hasta 5 MB." };
    }
    const extension = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
    receiptPath = `${fee.student_id}/${paymentId}.${extension}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await ctx.supabase.storage.from("receipts").upload(receiptPath, bytes, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) return { ok: false, error: "No pudimos subir el comprobante." };
  }

  const { error } = await ctx.supabase.from("payments").insert({
    id: paymentId,
    fee_id: fee.id,
    student_id: fee.student_id,
    amount_cents: cents,
    method: "efectivo",
    status: "approved",
    paid_at: `${parsed.data.paidOn}T12:00:00-03:00`,
    received_by: ctx.userId,
    created_by: ctx.userId,
    note: parsed.data.note || null,
    receipt_number: parsed.data.receiptNumber || null,
    receipt_path: receiptPath,
  });
  if (error) return { ok: false, error: "No pudimos guardar el pago en efectivo." };
  revalidatePath("/admin/pagos");
  revalidatePath("/admin/cuotas");
  revalidatePath("/admin");
  revalidatePath("/alumno/cuotas");
  return { ok: true, message: "Efectivo registrado." };
}

export async function voidCashPayment(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole(["admin"]);
  const parsed = voidPaymentSchema.safeParse({
    paymentId: formData.get("paymentId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { ok: false, error: fieldError(parsed.error) };
  const { data: payment } = await ctx.supabase.from("payments").select("*").eq("id", parsed.data.paymentId).maybeSingle();
  if (!payment) return { ok: false, error: "No encontramos ese pago." };
  const { data: fee } = await ctx.supabase.from("fees").select("*").eq("id", payment.fee_id).maybeSingle();
  const { data: payments } = await ctx.supabase.from("payments").select("*").eq("fee_id", payment.fee_id);
  if (!fee) return { ok: false, error: "No encontramos la cuota." };
  try {
    voidPayment(
      { fee: toSnapshot(fee), payments: (payments ?? []).map(toPayment) },
      { id: ctx.userId, role: "admin" },
      payment.id,
      parsed.data.reason,
      todayInArgentina(),
    );
  } catch (error) {
    return { ok: false, error: error instanceof DomainError ? error.message : "No pudimos anular el pago." };
  }
  const { error } = await ctx.supabase
    .from("payments")
    .update({
      status: "void",
      voided_by: ctx.userId,
      void_reason: parsed.data.reason,
      voided_at: new Date().toISOString(),
    })
    .eq("id", payment.id);
  if (error) return { ok: false, error: "No pudimos anular el pago." };
  revalidatePath("/admin/pagos");
  revalidatePath("/admin");
  revalidatePath("/alumno/cuotas");
  return { ok: true, message: "Pago anulado." };
}

export async function startMercadoPagoCheckout(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole(["student"]);
  const token = mercadoPagoToken();
  if (!token) return { ok: false, error: "El pago no está disponible." };
  const feeId = String(formData.get("feeId") ?? "");
  const { data: fee } = await ctx.supabase.from("fees").select("*").eq("id", feeId).maybeSingle();
  const manages = fee ? await canManageChild(ctx, fee.student_id) : false;
  if (!fee || (fee.student_id !== ctx.userId && !manages)) return { ok: false, error: "No encontramos esa cuota." };
  if (fee.status === "paid" || fee.status === "void") return { ok: false, error: "Esa cuota no está para pagar." };
  const { data: payments } = await ctx.supabase.from("payments").select("*").eq("fee_id", fee.id);
  const open = (payments ?? []).find((payment) => payment.method === "mercadopago" && payment.status === "pending" && payment.checkout_url);
  if (open?.checkout_url) redirect(open.checkout_url);
  const remaining = remainingCents(toSnapshot(fee), (payments ?? []).map(toPayment));
  if (remaining <= 0) return { ok: false, error: "Esta cuota ya está paga." };
  const { data: activity } = await ctx.supabase.from("activities").select("name").eq("id", fee.activity_id).maybeSingle();
  const paymentId = randomUUID();
  const origin = siteUrl();
  let checkout;
  try {
    checkout = await createCheckoutPreference({
      token,
      paymentId,
      title: `Cuota ${activity?.name ?? "Musical Club"} ${fee.period_start}`,
      amountCents: remaining,
      notificationUrl: isLocalSite() ? undefined : `${origin}/api/webhooks/mercadopago`,
      successUrl: `${origin}/alumno/cuotas?pago=ok`,
      pendingUrl: `${origin}/alumno/cuotas?pago=pendiente`,
      failureUrl: `${origin}/alumno/cuotas?pago=error`,
    });
  } catch {
    return { ok: false, error: "No pudimos iniciar el pago." };
  }
  const { error } = await ctx.supabase.from("payments").insert({
    id: paymentId,
    fee_id: fee.id,
    student_id: fee.student_id,
    amount_cents: remaining,
    method: "mercadopago",
    status: "pending",
    created_by: ctx.userId,
    mp_preference_id: checkout.preferenceId,
    checkout_url: checkout.checkoutUrl,
  });
  if (error) return { ok: false, error: "No pudimos iniciar el pago." };
  redirect(checkout.checkoutUrl);
}

export async function syncMercadoPagoPayment(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole(["student", "admin"]);
  const token = mercadoPagoToken();
  const admin = createAdminClient();
  if (!token || !admin) return { ok: false, error: "El pago no está disponible." };
  const paymentId = String(formData.get("paymentId") ?? "");
  const { data: payment } = await admin.from("payments").select("*").eq("id", paymentId).maybeSingle();
  if (!payment || payment.method !== "mercadopago") return { ok: false, error: "Ese pago no es de Mercado Pago." };
  if (
    ctx.profile.role !== "admin" &&
    ctx.role !== "super_admin" &&
    payment.student_id !== ctx.userId &&
    !(await canManageChild(ctx, payment.student_id))
  ) {
    return { ok: false, error: "Ese pago no es tuyo." };
  }
  if (!payment.mp_payment_id && payment.status === "pending") {
    return { ok: true, message: "Falta la confirmación." };
  }
  if (payment.status === "approved") return { ok: true, message: "Pago acreditado." };
  return { ok: true, message: "Esperando la confirmación." };
}

export async function applyMercadoPagoNotification(input: {
  mpPaymentId: string;
  externalReference: string | null;
  status: string;
  amountCents: number;
}): Promise<"approved" | "rejected" | "duplicate" | "mismatch" | "missing"> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY.");
  const localId = input.externalReference;
  if (!localId) return "missing";
  const { data: payment } = await admin.from("payments").select("*").eq("id", localId).maybeSingle();
  if (!payment) return "missing";
  if (payment.mp_payment_id === input.mpPaymentId && payment.status !== "pending") return "duplicate";
  if (payment.amount_cents !== input.amountCents) return "mismatch";
  if (payment.status !== "pending") return "duplicate";
  const nextStatus = input.status === "approved" ? "approved" : "rejected";
  const { data: updated } = await admin
    .from("payments")
    .update({
      status: nextStatus,
      mp_payment_id: input.mpPaymentId,
      mp_status: input.status,
      paid_at: nextStatus === "approved" ? new Date().toISOString() : null,
    })
    .eq("id", payment.id)
    .eq("status", "pending")
    .select("id");
  return updated && updated.length > 0 ? nextStatus : "duplicate";
}

