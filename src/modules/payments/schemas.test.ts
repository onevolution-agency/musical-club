import { describe, expect, it } from "vitest";
import { z } from "zod";
import { cashPaymentSchema } from "./schemas";

const paymentMethodSchema = z.enum(["mercadopago", "efectivo"]);

describe("payment method", () => {
  it("accepts only mercadopago and efectivo", () => {
    expect(paymentMethodSchema.parse("mercadopago")).toBe("mercadopago");
    expect(paymentMethodSchema.parse("efectivo")).toBe("efectivo");
    expect(paymentMethodSchema.safeParse("transferencia").success).toBe(false);
    expect(paymentMethodSchema.safeParse("otro").success).toBe(false);
  });

  it("does not take a method on the cash form", () => {
    const parsed = cashPaymentSchema.parse({
      feeId: "11111111-1111-4111-8111-111111111111",
      amountPesos: "1500.50",
      paidOn: "2026-03-01",
      receiptNumber: "A-1",
      note: "",
    });
    expect(parsed.amountPesos).toBe(1500.5);
    expect("method" in parsed).toBe(false);
  });
});
