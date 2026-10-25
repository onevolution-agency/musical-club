import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { requireRole, scopeBarrio } from "@/modules/auth/session";
import { paymentMethodLabel, paymentStatusLabel } from "@/modules/activities/labels";
import { voidCashPayment } from "@/modules/payments/actions";
import { reconcileCash } from "@/modules/payments/domain";
import { formatARS, formatDateTimeAR, todayInArgentina } from "@/lib/time";
import type { PaymentStatus } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: { absolute: "Pagos · Musical Club" } };

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ medio?: string; estado?: string; desde?: string; hasta?: string }>;
}) {
  const filters = await searchParams;
  const ctx = await requireRole(["admin"]);
  const today = todayInArgentina();
  const from = filters.desde || `${today.slice(0, 8)}01`;
  const to = filters.hasta || today;
  let query = scopeBarrio(ctx.supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(300), ctx.barrioId);
  const statuses: PaymentStatus[] = ["pending", "approved", "rejected", "void"];
  if (filters.medio === "mercadopago" || filters.medio === "efectivo") query = query.eq("method", filters.medio);
  if (filters.estado && statuses.includes(filters.estado as PaymentStatus)) {
    query = query.eq("status", filters.estado as PaymentStatus);
  }
  const { data: payments } = await query;
  const { data: profiles } = await ctx.supabase.from("profiles").select("id, full_name, account_kind");
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name || "Sin nombre"]));
  const kids = new Set((profiles ?? []).filter((profile) => profile.account_kind === "kid").map((profile) => profile.id));
  const inRange = (payments ?? []).filter((payment) => {
    const day = (payment.paid_at ?? payment.created_at).slice(0, 10);
    return day >= from && day <= to;
  });
  const cash = reconcileCash(
    inRange.map((payment) => ({
      id: payment.id,
      feeId: payment.fee_id,
      amountCents: payment.amount_cents,
      method: payment.method,
      status: payment.status,
      receivedBy: payment.received_by,
      paidOn: (payment.paid_at ?? payment.created_at).slice(0, 10),
    })),
    from,
    to,
  );
  const { data: audit } = await ctx.supabase.from("payment_audit").select("*").order("created_at", { ascending: false }).limit(30);
  return (
    <div className="stack">
      <h1 className="display" style={{ fontSize: "2.2rem" }}>
        Pagos y efectivo
      </h1>
      <form className="row" method="get">
        <input type="date" name="desde" defaultValue={from} />
        <input type="date" name="hasta" defaultValue={to} />
        <select name="medio" defaultValue={filters.medio ?? ""}>
          <option value="">Todos los medios</option>
          <option value="mercadopago">Mercado Pago</option>
          <option value="efectivo">Efectivo</option>
        </select>
        <select name="estado" defaultValue={filters.estado ?? ""}>
          <option value="">Todos</option>
          <option value="approved">Acreditado</option>
          <option value="pending">Pendiente</option>
          <option value="rejected">Rechazado</option>
          <option value="void">Anulado</option>
        </select>
        <button className="btn btn-gold">Filtrar</button>
        <a className="btn btn-ghost" href={`/api/admin/export?tipo=pagos&desde=${from}&hasta=${to}`}>
          CSV
        </a>
      </form>
      <section className="panel">
        <h2 className="display" style={{ fontSize: "1.4rem" }}>
          Conciliación de efectivo
        </h2>
        {cash.length === 0 ? <p className="empty">No hay efectivo.</p> : null}
        <ul className="stars">
          {cash.map((row) => (
            <li key={row.adminId}>
              {names.get(row.adminId) ?? row.adminId}: {formatARS(row.totalCents)} en {row.count} cobro{row.count === 1 ? "" : "s"}
            </li>
          ))}
        </ul>
      </section>
      {inRange.length === 0 ? <p className="empty">No hay pagos.</p> : null}
      {inRange.map((payment) => (
        <article key={payment.id} className="panel">
          <p>
            <span className="badge">{paymentMethodLabel[payment.method]}</span>{" "}
            <span className="badge badge-gold">{paymentStatusLabel[payment.status]}</span> {formatARS(payment.amount_cents)}
          </p>
          <p>
            {names.get(payment.student_id)} {kids.has(payment.student_id) ? <span className="badge">Kid</span> : null} · {formatDateTimeAR(payment.paid_at ?? payment.created_at)}
          </p>
          {payment.method === "efectivo" ? <p>Recibió {names.get(payment.received_by ?? "") ?? "—"} {payment.receipt_number ? `· recibo ${payment.receipt_number}` : ""}</p> : null}
          {payment.note ? <p>{payment.note}</p> : null}
          {payment.void_reason ? <p>Anulación: {payment.void_reason}</p> : null}
          {payment.status === "approved" ? (
            <ActionForm action={voidCashPayment} className="row">
              <input type="hidden" name="paymentId" value={payment.id} />
              <input name="reason" required minLength={3} placeholder="Motivo" aria-label="Motivo" />
              <SubmitButton className="btn btn-ghost">Anular</SubmitButton>
            </ActionForm>
          ) : null}
        </article>
      ))}
      <section>
        <h2 className="display" style={{ fontSize: "1.4rem" }}>
          Auditoría reciente
        </h2>
        <ul className="stars">
          {(audit ?? []).map((row) => (
            <li key={row.id}>
              {formatDateTimeAR(row.created_at)} · {row.action} · {names.get(row.actor_id ?? "") ?? "sistema"}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
