import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { requireRole, scopeBarrio } from "@/modules/auth/session";
import { feeStatusLabel, frequencyLabel } from "@/modules/activities/labels";
import { generateFees, registerCash } from "@/modules/payments/actions";
import { remainingCents, type PaymentSnapshot } from "@/modules/payments/domain";
import { formatARS, formatDateAR, todayInArgentina } from "@/lib/time";
import type { FeeStatus } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: { absolute: "Cuotas · Musical Club" } };

export default async function AdminFees({ searchParams }: { searchParams: Promise<{ estado?: string; actividad?: string }> }) {
  const filters = await searchParams;
  const ctx = await requireRole(["admin"]);
  const statuses: FeeStatus[] = ["pending", "partial", "paid", "overdue", "void"];
  let query = scopeBarrio(ctx.supabase.from("fees").select("*").order("due_date", { ascending: false }).limit(200), ctx.barrioId);
  if (filters.estado && statuses.includes(filters.estado as FeeStatus)) {
    query = query.eq("status", filters.estado as FeeStatus);
  }
  if (filters.actividad) query = query.eq("activity_id", filters.actividad);
  const { data: fees } = await query;
  const { data: activities } = await scopeBarrio(ctx.supabase.from("activities").select("id, name, price_cents, billing_frequency"), ctx.barrioId);
  const { data: students } = await ctx.supabase.from("profiles").select("id, full_name");
  const ids = (fees ?? []).map((fee) => fee.id);
  const { data: payments } = ids.length ? await ctx.supabase.from("payments").select("*").in("fee_id", ids) : { data: [] };
  return (
    <div className="stack">
      <h1 className="display" style={{ fontSize: "2.2rem" }}>
        Cuotas
      </h1>
      <ActionForm action={generateFees} className="panel row">
        <label className="field">
          <span>Generar hasta</span>
          <input type="date" name="until" defaultValue={todayInArgentina()} />
        </label>
        <SubmitButton>Generar cuotas</SubmitButton>
      </ActionForm>
      <ul className="stars">
        {(activities ?? []).map((activity) => (
          <li key={activity.id}>
            {activity.name}: {frequencyLabel[activity.billing_frequency]} · {activity.price_cents > 0 ? formatARS(activity.price_cents) : "sin monto"}
          </li>
        ))}
      </ul>
      <form className="row" method="get">
        <select name="actividad" defaultValue={filters.actividad ?? ""}>
          <option value="">Todas</option>
          {(activities ?? []).map((activity) => (
            <option key={activity.id} value={activity.id}>
              {activity.name}
            </option>
          ))}
        </select>
        <select name="estado" defaultValue={filters.estado ?? ""}>
          <option value="">Todos</option>
          <option value="pending">Pendiente</option>
          <option value="partial">Parcial</option>
          <option value="overdue">Vencida</option>
          <option value="paid">Paga</option>
          <option value="void">Anulada</option>
        </select>
        <button className="btn btn-gold">Filtrar</button>
        <a className="btn btn-ghost" href={`/api/admin/export?tipo=cuotas`}>
          CSV
        </a>
      </form>
      {(fees ?? []).length === 0 ? <p className="empty">No hay cuotas.</p> : null}
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
        return (
          <article key={fee.id} className="panel">
            <h2 className="display" style={{ fontSize: "1.3rem" }}>
              {students?.find((student) => student.id === fee.student_id)?.full_name} · {activities?.find((activity) => activity.id === fee.activity_id)?.name}
            </h2>
            <p>
              {formatDateAR(fee.period_start)} – {formatDateAR(fee.period_end)} · <span className="badge">{feeStatusLabel[fee.status]}</span>{" "}
              {formatARS(fee.amount_cents)}
              {balance > 0 && fee.status !== "void" ? ` · saldo ${formatARS(balance)}` : ""}
            </p>
            {balance > 0 && fee.status !== "void" ? (
              <ActionForm action={registerCash}>
                <input type="hidden" name="feeId" value={fee.id} />
                <div className="row">
                  <label className="field">
                    <span>Efectivo (ARS)</span>
                    <input name="amountPesos" type="number" min="0.01" step="0.01" required defaultValue={(balance / 100).toFixed(2)} />
                  </label>
                  <label className="field">
                    <span>Fecha</span>
                    <input name="paidOn" type="date" required defaultValue={todayInArgentina()} />
                  </label>
                  <label className="field">
                    <span>Recibo</span>
                    <input name="receiptNumber" />
                  </label>
                </div>
                <label className="field">
                  <span>Nota</span>
                  <input name="note" />
                </label>
                <label className="field">
                  <span>Comprobante</span>
                  <input name="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" />
                </label>
                <SubmitButton>Registrar efectivo</SubmitButton>
              </ActionForm>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
