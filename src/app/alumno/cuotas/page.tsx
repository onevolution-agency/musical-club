import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { requireRole } from "@/modules/auth/session";
import { activeStudent } from "@/modules/kids/session";
import { feeStatusLabel, paymentMethodLabel, paymentStatusLabel } from "@/modules/activities/labels";
import { startMercadoPagoCheckout } from "@/modules/payments/actions";
import { remainingCents, type PaymentSnapshot } from "@/modules/payments/domain";
import { formatARS, formatDateAR, formatDateTimeAR } from "@/lib/time";

export const metadata: Metadata = { title: { absolute: "Cuotas · Musical Club" } };

export default async function FeesPage({ searchParams }: { searchParams: Promise<{ pago?: string }> }) {
  const params = await searchParams;
  const ctx = await requireRole(["student"]);
  const family = await activeStudent(ctx);
  const { data: fees } = await ctx.supabase.from("fees").select("*").eq("student_id", family.id).order("due_date", { ascending: false });
  const feeIds = (fees ?? []).map((fee) => fee.id);
  const { data: payments } = feeIds.length
    ? await ctx.supabase.from("payments").select("*").in("fee_id", feeIds).order("created_at", { ascending: false })
    : { data: [] };
  const { data: activities } = await ctx.supabase.from("activities").select("id, name");
  const notice =
    params.pago === "ok"
      ? "Si Mercado Pago acreditó el pago, la cuota se actualiza en unos segundos."
      : params.pago === "error"
        ? "El pago no se completó. Podés intentarlo de nuevo."
        : null;
  return (
    <div className="stack">
      <h1 className="display" style={{ fontSize: "2.2rem" }}>
        Cuotas
      </h1>
      <p>Pagás vos por Mercado Pago. Si abonás en efectivo, un admin lo carga y lo ves acá.</p>
      {notice ? <p className="form-ok">{notice}</p> : null}
      {(fees ?? []).length === 0 ? <p className="empty">Cuando la administración genere el período, las cuotas aparecen acá.</p> : null}
      {(fees ?? []).map((fee) => {
        const related = (payments ?? []).filter((payment) => payment.fee_id === fee.id);
        const snapshots: PaymentSnapshot[] = related.map((payment) => ({
          id: payment.id,
          feeId: payment.fee_id,
          amountCents: payment.amount_cents,
          method: payment.method,
          status: payment.status,
        }));
        const balance = remainingCents(
          { id: fee.id, amountCents: fee.amount_cents, dueDate: fee.due_date, status: fee.status },
          snapshots,
        );
        const activity = activities?.find((item) => item.id === fee.activity_id);
        return (
          <article key={fee.id} className="panel">
            <h2 className="display" style={{ fontSize: "1.5rem" }}>
              {activity?.name ?? "Actividad"}
            </h2>
            <p>
              {formatDateAR(fee.period_start)} – {formatDateAR(fee.period_end)} · vence {formatDateAR(fee.due_date)}
            </p>
            <p>
              <span className="badge">{feeStatusLabel[fee.status]}</span> {formatARS(fee.amount_cents)}
              {balance > 0 && fee.status !== "void" ? ` · saldo ${formatARS(balance)}` : ""}
            </p>
            {balance > 0 && fee.status !== "void" ? (
              <ActionForm action={startMercadoPagoCheckout}>
                <input type="hidden" name="feeId" value={fee.id} />
                <SubmitButton>Pagar con Mercado Pago</SubmitButton>
              </ActionForm>
            ) : null}
          </article>
        );
      })}
      <section>
        <h2 className="display" style={{ fontSize: "1.6rem" }}>
          Historial de pagos
        </h2>
        {(payments ?? []).length === 0 ? <p className="empty">Todavía no hay pagos.</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Medio</th>
                <th>Estado</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {(payments ?? []).map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.paid_at ? formatDateTimeAR(payment.paid_at) : formatDateTimeAR(payment.created_at)}</td>
                  <td>{paymentMethodLabel[payment.method]}</td>
                  <td>{paymentStatusLabel[payment.status]}</td>
                  <td>{formatARS(payment.amount_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
