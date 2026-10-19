import Link from "next/link";
import { requireRole, scopeBarrio } from "@/modules/auth/session";
import { ageGroupCopy, weekdays } from "@/modules/activities/labels";
import { feeStatusLabel } from "@/modules/activities/labels";
import { formatARS, formatDateAR } from "@/lib/time";

export default async function StudentHome() {
  const ctx = await requireRole(["student"]);
  const { data: enrollments } = await scopeBarrio(
    ctx.supabase
      .from("enrollments")
      .select("id, status, activity_id, starts_on")
      .eq("student_id", ctx.userId)
      .in("status", ["active", "pending", "waitlist"]),
    ctx.barrioId,
  );
  const activityIds = (enrollments ?? []).map((item) => item.activity_id);
  const { data: activities } = activityIds.length
    ? await ctx.supabase.from("activities").select("*").in("id", activityIds)
    : { data: [] };
  const { data: fees } = await scopeBarrio(
    ctx.supabase.from("fees").select("*").eq("student_id", ctx.userId).in("status", ["pending", "partial", "overdue"]).order("due_date"),
    ctx.barrioId,
  );
  return (
    <div className="stack">
      <h1 className="display" style={{ fontSize: "2.4rem" }}>
        Hola{ctx.profile.full_name ? `, ${ctx.profile.full_name}` : ""}
      </h1>
      <div className="row">
        <Link className="btn btn-red" href="/alumno/qr">
          Mostrar mi QR
        </Link>
        <Link className="btn btn-ghost" href="/alumno/cuotas">
          Ver cuotas
        </Link>
      </div>
      <section>
        <h2 className="display" style={{ fontSize: "1.8rem" }}>
          Tu horario
        </h2>
        {(enrollments ?? []).length === 0 ? (
          <p className="empty">
            Todavía no tenés actividades. <Link href="/alumno/actividades">Mirá los grupos</Link>.
          </p>
        ) : (
          <div className="card-list">
            {(enrollments ?? []).map((enrollment) => {
              const activity = activities?.find((item) => item.id === enrollment.activity_id);
              if (!activity) return null;
              return (
                <article key={enrollment.id} className="panel">
                  <p className="kicker">{ageGroupCopy[activity.age_group]}</p>
                  <h3 className="display" style={{ fontSize: "1.7rem" }}>
                    {activity.name}
                  </h3>
                  <p>{activity.schedule_label}</p>
                  {activity.weekday !== null ? (
                    <p>
                      {weekdays[activity.weekday]} {activity.start_time?.slice(0, 5)} {activity.location}
                    </p>
                  ) : (
                    <p>{activity.location}</p>
                  )}
                  <span className="badge">{enrollment.status === "waitlist" ? "Lista de espera" : "Activa"}</span>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <section>
        <h2 className="display" style={{ fontSize: "1.8rem" }}>
          Cuotas abiertas
        </h2>
        {(fees ?? []).length === 0 ? <p className="empty">No tenés cuotas pendientes.</p> : null}
        <ul className="stars">
          {(fees ?? []).map((fee) => (
            <li key={fee.id}>
              {formatDateAR(fee.due_date)} · {formatARS(fee.amount_cents)} · {feeStatusLabel[fee.status]}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
