import { SubmitButton } from "@/components/ui/forms";
import { requireRole } from "@/modules/auth/session";
import { openSession } from "@/modules/attendance/actions";
import { ageGroupCopy } from "@/modules/activities/labels";
import { formatDateTimeAR } from "@/lib/time";

export default async function TeacherHome() {
  const ctx = await requireRole(["teacher", "admin"]);
  const { data: assignments } = await ctx.supabase.from("activity_teachers").select("activity_id").eq("teacher_id", ctx.userId);
  const ids = (assignments ?? []).map((item) => item.activity_id);
  const { data: activities } = ids.length
    ? await ctx.supabase.from("activities").select("*").in("id", ids)
    : { data: [] };
  const { data: sessions } = ids.length
    ? await ctx.supabase.from("class_sessions").select("*").in("activity_id", ids).order("starts_at", { ascending: false }).limit(12)
    : { data: [] };
  return (
    <div className="stack">
      <h1 className="display" style={{ fontSize: "2.2rem" }}>
        Tus clases
      </h1>
      {(activities ?? []).length === 0 ? (
        <p className="empty">Todavía no tenés actividades asignadas. Pedile a un admin que te sume.</p>
      ) : null}
      {(activities ?? []).map((activity) => {
        const open = sessions?.find((session) => session.activity_id === activity.id && session.status === "open");
        return (
          <article key={activity.id} className="panel">
            <p className="kicker">{ageGroupCopy[activity.age_group]}</p>
            <h2 className="display" style={{ fontSize: "1.7rem" }}>
              {activity.name}
            </h2>
            <p>{activity.schedule_label}</p>
            <p>{activity.location}</p>
            <form action={openSession}>
              <input type="hidden" name="activityId" value={activity.id} />
              <SubmitButton>{open ? "Seguir la lista" : "Abrir clase"}</SubmitButton>
            </form>
          </article>
        );
      })}
      <section>
        <h2 className="display" style={{ fontSize: "1.6rem" }}>
          Últimas sesiones
        </h2>
        {(sessions ?? []).length === 0 ? <p className="empty">Cuando abras una clase, queda el historial.</p> : null}
        <ul className="stars">
          {(sessions ?? []).map((session) => (
            <li key={session.id}>
              {formatDateTimeAR(session.starts_at)} · {session.status === "open" ? "abierta" : "cerrada"} ·{" "}
              <a href={`/profesor/sesion/${session.id}`}>ver</a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
