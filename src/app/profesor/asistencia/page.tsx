import Link from "next/link";
import { requireRole, scopeBarrio } from "@/modules/auth/session";
import { formatDateTimeAR } from "@/lib/time";

export default async function TeacherHistory() {
  const ctx = await requireRole(["teacher", "admin"]);
  const { data: assignments } = await scopeBarrio(
    ctx.supabase.from("activity_teachers").select("activity_id").eq("teacher_id", ctx.userId),
    ctx.barrioId,
  );
  const ids = (assignments ?? []).map((row) => row.activity_id);
  const { data: sessions } = ids.length
    ? await ctx.supabase.from("class_sessions").select("*").in("activity_id", ids).order("starts_at", { ascending: false }).limit(40)
    : { data: [] };
  const sessionIds = (sessions ?? []).map((session) => session.id);
  const { data: marks } = sessionIds.length
    ? await ctx.supabase.from("attendance_marks").select("session_id").in("session_id", sessionIds)
    : { data: [] };
  const { data: activities } = ids.length ? await ctx.supabase.from("activities").select("id, name").in("id", ids) : { data: [] };
  return (
    <div className="stack">
      <h1 className="display" style={{ fontSize: "2.2rem" }}>
        Historial
      </h1>
      {(sessions ?? []).length === 0 ? <p className="empty">Todavía no hay clases tomadas.</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Clase</th>
              <th>Actividad</th>
              <th>Estado</th>
              <th>Presentes</th>
            </tr>
          </thead>
          <tbody>
            {(sessions ?? []).map((session) => (
              <tr key={session.id}>
                <td>
                  <Link href={`/profesor/sesion/${session.id}`}>{formatDateTimeAR(session.starts_at)}</Link>
                </td>
                <td>{activities?.find((activity) => activity.id === session.activity_id)?.name}</td>
                <td>{session.status === "open" ? "Abierta" : "Cerrada"}</td>
                <td>{(marks ?? []).filter((mark) => mark.session_id === session.id).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
