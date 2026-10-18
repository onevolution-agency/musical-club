import "server-only";

type PreferenceResponse = {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
  message?: string;
};

export type MercadoPagoPayment = {
  id?: number | string;
  status?: string;
  transaction_amount?: number;
  external_reference?: string | null;
};

export async function createCheckoutPreference(input: {
  token: string;
  paymentId: string;
  title: string;
  amountCents: number;
  notificationUrl?: string;
  successUrl: string;
  pendingUrl: string;
  failureUrl: string;
}): Promise<{ preferenceId: string; checkoutUrl: string }> {
  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": input.paymentId,
    },
    body: JSON.stringify({
      items: [
        {
          title: input.title,
          quantity: 1,
          currency_id: "ARS",
          unit_price: Number((input.amountCents / 100).toFixed(2)),
        },
      ],
      external_reference: input.paymentId,
      notification_url: input.notificationUrl,
      back_urls: {
        success: input.successUrl,
        pending: input.pendingUrl,
        failure: input.failureUrl,
      },
      auto_return: "approved",
    }),
  });
  const body = (await response.json()) as PreferenceResponse;
  if (!response.ok || !body.id) {
    throw new Error(body.message || "Mercado Pago no pudo crear el checkout.");
  }
  const sandbox = input.token.startsWith("TEST-");
  const checkoutUrl = (sandbox ? body.sandbox_init_point : body.init_point) || body.init_point || body.sandbox_init_point;
  if (!checkoutUrl) throw new Error("Mercado Pago no devolvió el link de pago.");
  return { preferenceId: body.id, checkoutUrl };
}

export async function fetchMercadoPagoPayment(id: string, token: string): Promise<MercadoPagoPayment> {
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("No pudimos consultar el pago en Mercado Pago.");
  }
  return (await response.json()) as MercadoPagoPayment;
}
