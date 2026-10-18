import Link from "next/link";
import { Bars } from "@/components/dashboard/charts";
import { requireRole } from "@/modules/auth/session";
import { summarizeDashboard } from "@/modules/dashboard/domain";
import { formatARS, todayInArgentina } from "@/lib/time";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  const params = await searchParams;
  const ctx = await requireRole(["admin"]);
  const db = createAdminClient() ?? ctx.supabase;
  const today = todayInArgentina();
  const from = params.desde || `${today.slice(0, 8)}01`;
  const to = params.hasta || today;
  const [{ data: payments }, { data: fees }, { data: enrollments }, { data: activities }, { data: sessions }, { data: marks }, { data: profiles }] =
    await Promise.all([
      db.from("payments").select("*"),
      db.from("fees").select("*"),
      db.from("enrollments").select("student_id, activity_id, status"),
      db.from("activities").select("id, name"),
      db.from("class_sessions").select("id, activity_id, starts_at"),
      db.from("attendance_marks").select("session_id"),
      db.from("profiles").select("id, full_name, role"),
    ]);
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name || "Admin"]));
  const attendance = (activities ?? []).map((activity) => {
    const activitySessions = (sessions ?? []).filter((session) => {
      const day = session.starts_at.slice(0, 10);
      return session.activity_id === activity.id && day >= from && day <= to;
    });
    const sessionIds = new Set(activitySessions.map((session) => session.id));
    return {
      activityId: activity.id,
      sessions: activitySessions.length,
      marks: (marks ?? []).filter((mark) => sessionIds.has(mark.session_id)).length,
      enrolled: (enrollments ?? []).filter((row) => row.activity_id === activity.id && row.status === "active").length,
    };
  });
  const summary = summarizeDashboard({
    payments: (payments ?? []).map((payment) => ({
      id: payment.id,
      feeId: payment.fee_id,
      amountCents: payment.amount_cents,
      method: payment.method,
      status: payment.status,
      receivedBy: payment.received_by,
      paidOn: (payment.paid_at ?? payment.created_at).slice(0, 10),
    })),
    fees: (fees ?? []).map((fee) => ({
      id: fee.id,
      amountCents: fee.amount_cents,
      dueDate: fee.due_date,
      status: fee.status,
      activityId: fee.activity_id,
      studentId: fee.student_id,
    })),
    enrollments: (enrollments ?? []).map((row) => ({
      studentId: row.student_id,
      activityId: row.activity_id,
      status: row.status,
    })),
    activities: activities ?? [],
    attendance,
    today,
    cashFrom: from,
    cashTo: to,
  });
  return (
    <div className="stack">
      <h1 className="display" style={{ fontSize: "2.2rem" }}>
        Tablero
      </h1>
      <form className="row" method="get">
        <label className="field">
          <span>Desde</span>
          <input type="date" name="desde" defaultValue={from} />
        </label>
        <label className="field">
          <span>Hasta</span>
          <input type="date" name="hasta" defaultValue={to} />
        </label>
        <button className="btn btn-gold">Filtrar</button>
      </form>
      <div className="stat-grid">
        <article className="stat">
          <span>Ingresos</span>
          <b>{formatARS(summary.revenueCents)}</b>
        </article>
        <article className="stat">
          <span>Mercado Pago</span>
          <b>{formatARS(summary.revenueByMethod.mercadopago)}</b>
        </article>
        <article className="stat">
          <span>Efectivo</span>
          <b>{formatARS(summary.revenueByMethod.efectivo)}</b>
        </article>
        <article className="stat">
          <span>Alumnos activos</span>
          <b>{summary.activeStudents}</b>
        </article>
        <article className="stat">
          <span>Pendiente</span>
          <b>{formatARS(summary.pendingCents)}</b>
        </article>
        <article className="stat">
          <span>Vencido</span>
          <b>{formatARS(summary.overdueCents)}</b>
        </article>
      </div>
      <Bars
        label="Ingresos por medio"
        data={[
          { name: "Mercado Pago", value: summary.revenueByMethod.mercadopago / 100 },
          { name: "Efectivo", value: summary.revenueByMethod.efectivo / 100 },
        ]}
      />
      <Bars
        label="Inscripciones por actividad"
        data={summary.enrollmentsByActivity.map((row) => ({ name: row.name, value: row.count }))}
      />
      <Bars
        label="Asistencia %"
        data={summary.attendanceByActivity.map((row) => ({ name: row.name, value: row.rate }))}
      />
      <section className="panel">
        <h2 className="display" style={{ fontSize: "1.5rem" }}>
          Efectivo por admin
        </h2>
        {summary.cashByAdmin.length === 0 ? <p className="empty">No hay efectivo en este período.</p> : null}
        <ul className="stars">
          {summary.cashByAdmin.map((row) => (
            <li key={row.adminId}>
              {names.get(row.adminId) ?? row.adminId}: {formatARS(row.totalCents)} ({row.count})
            </li>
          ))}
        </ul>
        <Link href={`/admin/pagos?desde=${from}&hasta=${to}&medio=efectivo`}>Ver conciliación</Link>
      </section>
    </div>
  );
}
