import type { Metadata } from "next";
import Link from "next/link";
import { requireRole, scopeBarrio } from "@/modules/auth/session";
import { markNoticeRead } from "@/modules/follow/actions";
import { activeStudent } from "@/modules/kids/session";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { ageGroupCopy, weekdays } from "@/modules/activities/labels";
import { feeStatusLabel } from "@/modules/activities/labels";
import { formatARS, formatDateAR } from "@/lib/time";

export const metadata: Metadata = { title: { absolute: "Tu espacio · Musical Club" } };

export default async function StudentHome() {
  const ctx = await requireRole(["student"]);
  const family = await activeStudent(ctx);
  const { data: enrollments } = await scopeBarrio(
    ctx.supabase
      .from("enrollments")
      .select("id, status, activity_id, starts_on")
      .eq("student_id", family.id)
      .in("status", ["active", "pending", "waitlist"]),
    ctx.barrioId,
  );
  const activityIds = (enrollments ?? []).map((item) => item.activity_id);
  const { data: activities } = activityIds.length
    ? await ctx.supabase.from("activities").select("*").in("id", activityIds)
    : { data: [] };
  const { data: fees } = await scopeBarrio(
    ctx.supabase.from("fees").select("*").eq("student_id", family.id).in("status", ["pending", "partial", "overdue"]).order("due_date"),
    ctx.barrioId,
  );
  const { data: marks } = family.self
    ? { data: [] }
    : await ctx.supabase
        .from("attendance_marks")
        .select("id, marked_at")
        .eq("student_id", family.id)
        .order("marked_at", { ascending: false })
        .limit(6);
  const { data: notices } =
    family.mode === "follow"
      ? await ctx.supabase
          .from("guardian_notices")
          .select("id, kind, created_at, read_at")
          .eq("child_id", family.id)
          .is("read_at", null)
          .order("created_at", { ascending: false })
          .limit(8)
      : { data: [] };
  return (
    <div className="stack">
      <h1 className="display" style={{ fontSize: "2.4rem" }}>
        Hola{family.profile.full_name ? `, ${family.profile.full_name}` : ""}
      </h1>
      {family.mode === "follow" ? <p className="kicker">Seguimiento</p> : null}
      <div className="row">
        {family.mode === "follow" ? null : (
          <Link className="btn btn-red" href="/alumno/qr">
            Mostrar mi QR
          </Link>
        )}
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
            No tenés actividades. <Link href="/alumno/actividades">Ver grupos</Link>
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
      {family.mode === "follow" ? (
        <section>
          <h2 className="display" style={{ fontSize: "1.8rem" }}>
            Avisos
          </h2>
          {(notices ?? []).length === 0 ? <p className="empty">Sin avisos.</p> : null}
          {(notices ?? []).map((notice) => (
            <ActionForm key={notice.id} action={markNoticeRead} className="row">
              <input type="hidden" name="noticeId" value={notice.id} />
              <span style={{ flex: 1 }}>{notice.kind === "absence" ? "Falta" : "Cuota vencida"}</span>
              <SubmitButton className="btn btn-paper">Listo</SubmitButton>
            </ActionForm>
          ))}
        </section>
      ) : null}
      {family.self ? null : (
        <section>
          <h2 className="display" style={{ fontSize: "1.8rem" }}>
            Asistencia
          </h2>
          {(marks ?? []).length === 0 ? <p className="empty">Sin marcas.</p> : null}
          <ul className="stars">
            {(marks ?? []).map((mark) => (
              <li key={mark.id}>{formatDateAR(mark.marked_at.slice(0, 10))}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
