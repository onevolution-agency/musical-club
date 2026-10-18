import { describe, expect, it } from "vitest";
import {
  applyGatewayResult,
  biweeklyPeriods,
  decideWebhook,
  deriveFeeStatus,
  DomainError,
  mercadoPagoManifest,
  missingPeriods,
  monthPeriods,
  reconcileCash,
  registerCashPayment,
  revenueByMethod,
  signManifest,
  verifyMercadoPagoSignature,
  voidPayment,
  type Ledger,
} from "./domain";

const today = "2026-03-10";

function feeLedger(overrides?: Partial<Ledger["fee"]>, payments: Ledger["payments"] = []): Ledger {
  return {
    fee: {
      id: "fee-1",
      amountCents: 10000,
      dueDate: "2026-03-01",
      status: "pending",
      ...overrides,
    },
    payments,
  };
}

describe("fee periods", () => {
  it("builds calendar months and keeps the first partial month", () => {
    expect(monthPeriods("2026-01-15", "2026-03-02")).toEqual([
      { periodStart: "2026-01-15", periodEnd: "2026-01-31", dueDate: "2026-01-15" },
      { periodStart: "2026-02-01", periodEnd: "2026-02-28", dueDate: "2026-02-01" },
      { periodStart: "2026-03-01", periodEnd: "2026-03-31", dueDate: "2026-03-01" },
    ]);
  });

  it("handles February in a leap year", () => {
    expect(monthPeriods("2028-02-01", "2028-02-10")).toEqual([
      { periodStart: "2028-02-01", periodEnd: "2028-02-29", dueDate: "2028-02-01" },
    ]);
  });

  it("builds 15-day blocks including the period that starts on until", () => {
    expect(biweeklyPeriods("2026-01-01", "2026-01-31")).toEqual([
      { periodStart: "2026-01-01", periodEnd: "2026-01-15", dueDate: "2026-01-01" },
      { periodStart: "2026-01-16", periodEnd: "2026-01-30", dueDate: "2026-01-16" },
      { periodStart: "2026-01-31", periodEnd: "2026-02-14", dueDate: "2026-01-31" },
    ]);
  });

  it("does not regenerate an existing period", () => {
    const generated = monthPeriods("2026-01-01", "2026-03-01");
    const missing = missingPeriods(["2026-01-01", "2026-02-01"], generated);
    expect(missing.map((period) => period.periodStart)).toEqual(["2026-03-01"]);
  });
});

describe("fee status", () => {
  it("marks a past-due unpaid fee overdue and a covered fee paid", () => {
    const fee = { amountCents: 5000, dueDate: "2026-03-01", status: "pending" as const };
    expect(deriveFeeStatus(fee, [], today)).toBe("overdue");
    expect(
      deriveFeeStatus(fee, [
        { id: "p", feeId: "f", amountCents: 5000, method: "efectivo", status: "approved" },
      ], today),
    ).toBe("paid");
  });

  it("keeps a partial payment as partial before the due date", () => {
    expect(
      deriveFeeStatus(
        { amountCents: 5000, dueDate: "2026-03-20", status: "pending" },
        [{ id: "p", feeId: "f", amountCents: 2000, method: "efectivo", status: "approved" }],
        today,
      ),
    ).toBe("partial");
  });
});

describe("cash payments", () => {
  const admin = { id: "admin-1", role: "admin" as const };

  it("lets only an admin register efectivo and marks the fee paid", () => {
    const ledger = registerCashPayment(
      feeLedger({ dueDate: "2026-03-20", status: "overdue" }),
      admin,
      { amountCents: 10000, paidOn: "2026-03-09", today },
    );
    expect(ledger.payments).toHaveLength(1);
    expect(ledger.payments[0]).toMatchObject({ method: "efectivo", status: "approved", receivedBy: "admin-1" });
    expect(ledger.fee.status).toBe("paid");
  });

  it("rejects teachers, students, overpayment, and a future date", () => {
    const ledger = feeLedger({ dueDate: "2026-03-20" });
    expect(() =>
      registerCashPayment(ledger, { id: "t", role: "teacher" }, { amountCents: 1000, paidOn: today, today }),
    ).toThrow(DomainError);
    expect(() =>
      registerCashPayment(ledger, { id: "s", role: "student" }, { amountCents: 1000, paidOn: today, today }),
    ).toThrow(DomainError);
    expect(() =>
      registerCashPayment(ledger, admin, { amountCents: 10001, paidOn: today, today }),
    ).toThrow(/supera el saldo/);
    expect(() =>
      registerCashPayment(ledger, admin, { amountCents: 1000, paidOn: "2026-03-11", today }),
    ).toThrow(/futura/);
  });

  it("supports a partial cash payment and voids it back to pending", () => {
    const partial = registerCashPayment(feeLedger({ dueDate: "2026-03-20" }), admin, {
      amountCents: 4000,
      paidOn: today,
      today,
    });
    expect(partial.fee.status).toBe("partial");
    const voided = voidPayment(partial, admin, "cash", "cobro duplicado", today);
    expect(voided.payments[0]?.status).toBe("void");
    expect(voided.fee.status).toBe("pending");
    expect(() => voidPayment(voided, admin, "cash", "otra vez", today)).toThrow(/anulado/);
    expect(() => voidPayment(partial, { id: "t", role: "teacher" }, "cash", "no", today)).toThrow(DomainError);
  });
});

describe("mercado pago webhook", () => {
  const secret = "test-secret";

  it("verifies the signature manifest and rejects tampering", () => {
    const dataId = "PAY-99";
    const requestId = "req-1";
    const ts = "1700000000";
    const manifest = mercadoPagoManifest(dataId, requestId, ts);
    expect(manifest).toBe("id:pay-99;request-id:req-1;ts:1700000000;");
    const v1 = signManifest(manifest, secret);
    const header = `ts=${ts},v1=${v1}`;
    expect(verifyMercadoPagoSignature({ signatureHeader: header, requestId, dataId, secret })).toBe(true);
    expect(
      verifyMercadoPagoSignature({ signatureHeader: header, requestId, dataId: "other", secret }),
    ).toBe(false);
    expect(verifyMercadoPagoSignature({ signatureHeader: header, requestId, dataId, secret: "" })).toBe(false);
  });

  it("decides approve, reject, ignore, and duplicate", () => {
    expect(decideWebhook({ topic: "payment", paymentStatus: "approved", alreadyProcessed: false })).toBe("approve");
    expect(decideWebhook({ topic: "payment", paymentStatus: "rejected", alreadyProcessed: false })).toBe("reject");
    expect(decideWebhook({ topic: "merchant_order", paymentStatus: "approved", alreadyProcessed: false })).toBe(
      "ignore",
    );
    expect(decideWebhook({ topic: "payment", paymentStatus: "approved", alreadyProcessed: true })).toBe("duplicate");
  });

  it("applies an approved payment once and ignores the replay", () => {
    const first = applyGatewayResult(feeLedger({ dueDate: "2026-03-20" }), {
      externalId: "mp-1",
      status: "approved",
      amountCents: 10000,
      today,
    });
    expect(first.duplicate).toBe(false);
    expect(first.ledger.fee.status).toBe("paid");
    expect(first.ledger.payments).toHaveLength(1);
    const second = applyGatewayResult(first.ledger, {
      externalId: "mp-1",
      status: "approved",
      amountCents: 10000,
      today,
    });
    expect(second.duplicate).toBe(true);
    expect(second.ledger.payments).toHaveLength(1);
    expect(second.ledger.fee.status).toBe("paid");
  });
});

describe("revenue and cash reconciliation", () => {
  const payments = [
    { id: "1", feeId: "f", amountCents: 3000, method: "efectivo" as const, status: "approved" as const, receivedBy: "ada", paidOn: "2026-03-02" },
    { id: "2", feeId: "f", amountCents: 7000, method: "mercadopago" as const, status: "approved" as const, receivedBy: null, paidOn: "2026-03-03" },
    { id: "3", feeId: "f", amountCents: 1500, method: "efectivo" as const, status: "approved" as const, receivedBy: "ada", paidOn: "2026-02-20" },
    { id: "4", feeId: "f", amountCents: 500, method: "efectivo" as const, status: "void" as const, receivedBy: "ada", paidOn: "2026-03-04" },
    { id: "5", feeId: "f", amountCents: 2000, method: "efectivo" as const, status: "approved" as const, receivedBy: "bea", paidOn: "2026-03-08" },
  ];

  it("splits approved revenue by method and ignores voids", () => {
    expect(revenueByMethod(payments)).toEqual({ mercadopago: 7000, efectivo: 6500 });
  });

  it("reconciles cash per admin inside the period", () => {
    expect(reconcileCash(payments, "2026-03-01", "2026-03-31")).toEqual([
      { adminId: "ada", totalCents: 3000, count: 1 },
      { adminId: "bea", totalCents: 2000, count: 1 },
    ]);
  });
});
