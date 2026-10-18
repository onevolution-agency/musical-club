import { createAdminClient } from "@/lib/supabase/admin";
import { mercadoPagoToken, mercadoPagoWebhookSecret } from "@/lib/env";
import { decideWebhook, verifyMercadoPagoSignature } from "@/modules/payments/domain";
import { fetchMercadoPagoPayment } from "@/modules/payments/mercadopago";
import { applyMercadoPagoNotification } from "@/modules/payments/actions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = mercadoPagoWebhookSecret();
  const token = mercadoPagoToken();
  const admin = createAdminClient();
  if (!secret || !token || !admin) {
    return Response.json({ ok: false, error: "Webhook sin configurar." }, { status: 500 });
  }

  const url = new URL(request.url);
  const body = (await request.json().catch(() => ({}))) as {
    type?: string;
    action?: string;
    data?: { id?: string | number };
  };
  const queryId = url.searchParams.get("data.id");
  const bodyId = body.data?.id != null ? String(body.data.id) : null;
  const dataId = queryId || bodyId;
  const topic = url.searchParams.get("type") || body.type || (body.action?.startsWith("payment") ? "payment" : null);
  const signature = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");

  const valid = verifyMercadoPagoSignature({
    signatureHeader: signature,
    requestId,
    dataId,
    secret,
  });
  if (!valid || !dataId) {
    return Response.json({ ok: false }, { status: 401 });
  }

  if (topic && topic !== "payment") {
    return Response.json({ ok: true, ignored: true });
  }

  let remote;
  try {
    remote = await fetchMercadoPagoPayment(dataId, token);
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }

  const dedupeKey = `payment:${dataId}:${remote.status ?? "unknown"}`;
  const { data: existing } = await admin.from("mp_webhook_events").select("result").eq("dedupe_key", dedupeKey).maybeSingle();
  const decision = decideWebhook({
    topic: "payment",
    paymentStatus: remote.status ?? null,
    alreadyProcessed: Boolean(existing?.result && existing.result !== "pending"),
  });
  if (decision === "duplicate" || decision === "ignore") {
    return Response.json({ ok: true, decision });
  }

  await admin.from("mp_webhook_events").insert({
    dedupe_key: dedupeKey,
    topic: "payment",
    resource_id: dataId,
    payload: { id: dataId, status: remote.status, external_reference: remote.external_reference },
    result: "pending",
  });

  const amountCents = Math.round(Number(remote.transaction_amount ?? 0) * 100);
  const result = await applyMercadoPagoNotification({
    mpPaymentId: String(remote.id ?? dataId),
    externalReference: remote.external_reference ?? null,
    status: decision === "approve" ? "approved" : "rejected",
    amountCents,
  });
  await admin
    .from("mp_webhook_events")
    .update({ result, processed_at: new Date().toISOString() })
    .eq("dedupe_key", dedupeKey);
  return Response.json({ ok: true, result });
}
