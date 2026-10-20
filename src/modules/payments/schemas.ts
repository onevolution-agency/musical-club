import { z } from "zod";

export const cashPaymentSchema = z.object({
  feeId: z.uuid(),
  amountPesos: z.coerce.number().positive("El monto tiene que ser mayor a cero."),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida."),
  receiptNumber: z.string().trim().max(80).optional().default(""),
  note: z.string().trim().max(500).optional().default(""),
});

export const voidPaymentSchema = z.object({
  paymentId: z.uuid(),
  reason: z.string().trim().min(3, "Falta el motivo.").max(300),
});

export const preferenceSchema = z.object({
  feeId: z.uuid(),
});

export const activitySchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(2).max(2000),
  ageGroup: z.enum(["kids", "youth_adults"]),
  scheduleLabel: z.string().trim().min(2).max(240),
  weekday: z.string().optional().default(""),
  startTime: z.string().optional().default(""),
  endTime: z.string().optional().default(""),
  location: z.string().trim().min(2).max(200),
  capacity: z.coerce.number().int().positive().max(500),
  pricePesos: z.coerce.number().min(0),
  billingFrequency: z.enum(["monthly", "biweekly"]),
  status: z.enum(["draft", "active", "archived"]),
});

export const enrollmentSchema = z.object({
  activityId: z.uuid(),
  studentId: z.uuid(),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Decinos tu nombre.").max(120),
  phone: z.string().trim().max(40).optional().default(""),
  dni: z.string().trim().max(20).optional().default(""),
  birthDate: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/),
  emergencyContact: z.string().trim().max(160).optional().default(""),
});

export const inquirySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email(),
  phone: z.string().trim().max(40).optional().default(""),
  community: z.string().trim().max(160).optional().default(""),
  message: z.string().trim().min(10).max(2000),
});

export const inviteSchema = z.object({
  email: z.email(),
  fullName: z.string().trim().min(2).max(120),
  role: z.enum(["teacher", "admin"]),
});

export const manualAttendanceSchema = z.object({
  sessionId: z.uuid(),
  studentId: z.uuid(),
});

export const scanAttendanceSchema = z.object({
  sessionId: z.uuid(),
  token: z.string().trim().min(10).max(200),
});

export function fieldError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revisá los datos.";
}
