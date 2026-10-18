import { createHmac, timingSafeEqual } from "node:crypto";

export const PAYMENT_METHODS = ["mercadopago", "efectivo"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type Role = "student" | "teacher" | "admin";
export type BillingFrequency = "monthly" | "biweekly";
export type FeeStatus = "pending" | "partial" | "paid" | "overdue" | "void";
export type PaymentStatus = "pending" | "approved" | "rejected" | "void";

export class DomainError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}

export type FeePeriod = {
  periodStart: string;
  periodEnd: string;
  dueDate: string;
};

export type FeeSnapshot = {
  id: string;
  amountCents: number;
  dueDate: string;
  status: FeeStatus;
};

export type PaymentSnapshot = {
  id: string;
  feeId: string;
  amountCents: number;
  method: PaymentMethod;
  status: PaymentStatus;
  externalId?: string | null;
  receivedBy?: string | null;
};

export type Ledger = {
  fee: FeeSnapshot;
  payments: PaymentSnapshot[];
};

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseISODate(iso: string): { y: number; m: number; d: number } {
  const match = ISO.exec(iso);
  if (!match) throw new DomainError("bad_date", "Fecha inválida.");
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) {
    throw new DomainError("bad_date", "Fecha inválida.");
  }
  return { y, m, d };
}

export function formatISODate(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function toUTC(iso: string): Date {
  const { y, m, d } = parseISODate(iso);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUTC(date: Date): string {
  return formatISODate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function addDays(iso: string, days: number): string {
  const date = toUTC(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUTC(date);
}

export function compareISO(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function startOfMonth(iso: string): string {
  const { y, m } = parseISODate(iso);
  return formatISODate(y, m, 1);
}

export function endOfMonth(iso: string): string {
  const { y, m } = parseISODate(iso);
  return fromUTC(new Date(Date.UTC(y, m, 0)));
}

export function addMonths(iso: string, months: number): string {
  const { y, m, d } = parseISODate(iso);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(d, lastDay));
  return fromUTC(first);
}

/** Monthly periods from the enrollment start through the month that contains `until`. */
export function monthPeriods(startsOn: string, until: string): FeePeriod[] {
  parseISODate(startsOn);
  parseISODate(until);
  const periods: FeePeriod[] = [];
  let monthCursor = startOfMonth(startsOn);
  const lastMonth = startOfMonth(until);
  let first = true;
  while (compareISO(monthCursor, lastMonth) <= 0) {
    const periodStart = first ? startsOn : monthCursor;
    periods.push({
      periodStart,
      periodEnd: endOfMonth(monthCursor),
      dueDate: periodStart,
    });
    first = false;
    const next = addMonths(monthCursor, 1);
    if (compareISO(next, monthCursor) <= 0) break;
    monthCursor = next;
    if (periods.length > 240) break;
  }
  return periods;
}

/** Inclusive 15-day blocks anchored on the enrollment start. */
export function biweeklyPeriods(startsOn: string, until: string): FeePeriod[] {
  parseISODate(startsOn);
  parseISODate(until);
  const periods: FeePeriod[] = [];
  let start = startsOn;
  while (compareISO(start, until) <= 0) {
    const periodEnd = addDays(start, 14);
    periods.push({ periodStart: start, periodEnd, dueDate: start });
    start = addDays(periodEnd, 1);
    if (periods.length > 500) break;
  }
  return periods;
}

export function periodsForEnrollment(input: {
  startsOn: string;
  frequency: BillingFrequency;
  until: string;
}): FeePeriod[] {
  if (compareISO(input.startsOn, input.until) > 0) return [];
  return input.frequency === "monthly"
    ? monthPeriods(input.startsOn, input.until)
    : biweeklyPeriods(input.startsOn, input.until);
}

export function missingPeriods(existingStarts: string[], generated: FeePeriod[]): FeePeriod[] {
  const have = new Set(existingStarts);
  return generated.filter((period) => !have.has(period.periodStart));
}

export function approvedTotal(payments: PaymentSnapshot[]): number {
  return payments.reduce((sum, payment) => {
    if (payment.status !== "approved") return sum;
    return sum + payment.amountCents;
  }, 0);
}

/**
 * Paid wins over the calendar. A past-due balance is overdue even if a partial
 * cash or Mercado Pago payment already landed. Partial is only before the due date.
 */
export function deriveFeeStatus(
  fee: Pick<FeeSnapshot, "amountCents" | "dueDate" | "status">,
  payments: PaymentSnapshot[],
  today: string,
): FeeStatus {
  if (fee.status === "void") return "void";
  const paid = approvedTotal(payments);
  if (fee.amountCents >= 0 && paid >= fee.amountCents) return "paid";
  if (compareISO(fee.dueDate, today) < 0) return "overdue";
  if (paid > 0) return "partial";
  return "pending";
}

export function remainingCents(fee: FeeSnapshot, payments: PaymentSnapshot[]): number {
  if (fee.status === "void") return 0;
  return Math.max(0, fee.amountCents - approvedTotal(payments));
}

export function assertCanRegisterCash(role: Role): void {
  if (role !== "admin") {
    throw new DomainError("forbidden", "Solo un admin puede registrar un pago en efectivo.");
  }
}

export type CashInput = {
  amountCents: number;
  paidOn: string;
  today: string;
  note?: string | null;
  receiptNumber?: string | null;
};

export function registerCashPayment(
  ledger: Ledger,
  actor: { id: string; role: Role },
  input: CashInput,
  paymentId = "cash",
): Ledger {
  assertCanRegisterCash(actor.role);
  parseISODate(input.paidOn);
  parseISODate(input.today);
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new DomainError("amount", "El monto tiene que ser mayor a cero.");
  }
  if (compareISO(input.paidOn, input.today) > 0) {
    throw new DomainError("future_date", "La fecha del cobro no puede ser futura.");
  }
  if (ledger.fee.status === "void") {
    throw new DomainError("fee_void", "La cuota está anulada.");
  }
  const remaining = remainingCents(ledger.fee, ledger.payments);
  if (remaining <= 0) {
    throw new DomainError("already_paid", "Esta cuota ya está paga.");
  }
  if (input.amountCents > remaining) {
    throw new DomainError("exceeds", "El monto supera el saldo de la cuota.");
  }

  const payments: PaymentSnapshot[] = [
    ...ledger.payments,
    {
      id: paymentId,
      feeId: ledger.fee.id,
      amountCents: input.amountCents,
      method: "efectivo",
      status: "approved",
      receivedBy: actor.id,
    },
  ];
  return {
    fee: {
      ...ledger.fee,
      status: deriveFeeStatus({ ...ledger.fee, status: "pending" }, payments, input.today),
    },
    payments,
  };
}

export function voidPayment(
  ledger: Ledger,
  actor: { id: string; role: Role },
  paymentId: string,
  reason: string,
  today: string,
): Ledger {
  if (actor.role !== "admin") {
    throw new DomainError("forbidden", "Solo un admin puede anular un pago.");
  }
  const payment = ledger.payments.find((item) => item.id === paymentId);
  if (!payment) throw new DomainError("not_found", "No encontramos ese pago.");
  if (payment.status === "void") throw new DomainError("already_void", "Ese pago ya está anulado.");
  if (reason.trim().length < 3) {
    throw new DomainError("reason", "Indicá el motivo de la anulación.");
  }
  const payments = ledger.payments.map((item) =>
    item.id === paymentId ? { ...item, status: "void" as const } : item,
  );
  const sticky = ledger.fee.status === "void" ? "void" : "pending";
  return {
    fee: {
      ...ledger.fee,
      status: deriveFeeStatus({ ...ledger.fee, status: sticky }, payments, today),
    },
    payments,
  };
}

export type WebhookDecision = "ignore" | "approve" | "reject" | "duplicate";

export function decideWebhook(input: {
  topic: string | null;
  paymentStatus: string | null;
  alreadyProcessed: boolean;
}): WebhookDecision {
  if (input.alreadyProcessed) return "duplicate";
  const topic = (input.topic ?? "").toLowerCase();
  if (topic && topic !== "payment") return "ignore";
  const status = (input.paymentStatus ?? "").toLowerCase();
  if (status === "approved") return "approve";
  if (status === "rejected" || status === "cancelled" || status === "refunded" || status === "charged_back") {
    return "reject";
  }
  return "ignore";
}

export function applyGatewayResult(
  ledger: Ledger,
  incoming: {
    externalId: string;
    status: "approved" | "rejected";
    amountCents: number;
    today: string;
  },
  paymentId = "mp",
): { ledger: Ledger; duplicate: boolean } {
  if (ledger.fee.status === "void") {
    return { ledger, duplicate: false };
  }
  const existing = ledger.payments.find((payment) => payment.externalId === incoming.externalId);
  if (existing) {
    if (existing.status === "approved" || existing.status === "void" || existing.status === incoming.status) {
      return { ledger, duplicate: true };
    }
    if (existing.status !== "pending") {
      return { ledger, duplicate: true };
    }
    const payments = ledger.payments.map((payment) =>
      payment.id === existing.id
        ? {
            ...payment,
            status: incoming.status,
            amountCents: incoming.amountCents,
            method: "mercadopago" as const,
          }
        : payment,
    );
    return {
      duplicate: false,
      ledger: {
        fee: {
          ...ledger.fee,
          status: deriveFeeStatus({ ...ledger.fee, status: "pending" }, payments, incoming.today),
        },
        payments,
      },
    };
  }

  const payments: PaymentSnapshot[] = [
    ...ledger.payments,
    {
      id: paymentId,
      feeId: ledger.fee.id,
      amountCents: incoming.amountCents,
      method: "mercadopago",
      status: incoming.status,
      externalId: incoming.externalId,
    },
  ];
  return {
    duplicate: false,
    ledger: {
      fee: {
        ...ledger.fee,
        status: deriveFeeStatus({ ...ledger.fee, status: "pending" }, payments, incoming.today),
      },
      payments,
    },
  };
}

export function parseSignatureHeader(header: string | null): { ts: string; v1: string } | null {
  if (!header) return null;
  let ts = "";
  let v1 = "";
  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === "ts") ts = value;
    if (key === "v1") v1 = value;
  }
  if (!ts || !v1) return null;
  return { ts, v1 };
}

export function mercadoPagoManifest(dataId: string, requestId: string, ts: string): string {
  return `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
}

export function signManifest(manifest: string, secret: string): string {
  return createHmac("sha256", secret).update(manifest).digest("hex");
}

export function verifyMercadoPagoSignature(input: {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
  secret: string;
}): boolean {
  if (!input.secret || !input.requestId || !input.dataId) return false;
  const parsed = parseSignatureHeader(input.signatureHeader);
  if (!parsed) return false;
  const manifest = mercadoPagoManifest(input.dataId, input.requestId, parsed.ts);
  const expected = signManifest(manifest, input.secret);
  const actual = parsed.v1.toLowerCase();
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

export function revenueByMethod(payments: PaymentSnapshot[]): Record<PaymentMethod, number> {
  const totals: Record<PaymentMethod, number> = { mercadopago: 0, efectivo: 0 };
  for (const payment of payments) {
    if (payment.status !== "approved") continue;
    totals[payment.method] += payment.amountCents;
  }
  return totals;
}

export type CashReconciliationRow = {
  adminId: string;
  totalCents: number;
  count: number;
};

export function reconcileCash(
  payments: Array<PaymentSnapshot & { paidOn: string }>,
  from: string,
  to: string,
): CashReconciliationRow[] {
  const rows = new Map<string, CashReconciliationRow>();
  for (const payment of payments) {
    if (payment.method !== "efectivo" || payment.status !== "approved" || !payment.receivedBy) continue;
    if (compareISO(payment.paidOn, from) < 0 || compareISO(payment.paidOn, to) > 0) continue;
    const current = rows.get(payment.receivedBy) ?? {
      adminId: payment.receivedBy,
      totalCents: 0,
      count: 0,
    };
    current.totalCents += payment.amountCents;
    current.count += 1;
    rows.set(payment.receivedBy, current);
  }
  return [...rows.values()].sort((a, b) => b.totalCents - a.totalCents || a.adminId.localeCompare(b.adminId));
}

export function pesosToCents(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new DomainError("amount", "El monto tiene que ser mayor a cero.");
  }
  const cents = Math.round(value * 100);
  if (cents <= 0) throw new DomainError("amount", "El monto tiene que ser mayor a cero.");
  return cents;
}
