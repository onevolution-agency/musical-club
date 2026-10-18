import Link from "next/link";
import { requireRole } from "@/modules/auth/session";
import { formatDateTimeAR } from "@/lib/time";

export default async function AdminAttendance({ searchParams }: { searchParams: Promise<{ actividad?: string }> }) {
  const { actividad } = await searchParams;
  const ctx = await requireRole(["admin"]);
  let sessionsQuery = ctx.supabase.from("class_sessions").select("*").order("starts_at", { ascending: false }).limit(80);
  if (actividad) sessionsQuery = sessionsQuery.eq("activity_id", actividad);
  const { data: sessions } = await sessionsQuery;
  const { data: activities } = await ctx.supabase.from("activities").select("id, name");
  const ids = (sessions ?? []).map((session) => session.id);
  const { data: marks } = ids.length ? await ctx.supabase.from("attendance_marks").select("session_id, student_id").in("session_id", ids) : { data: [] };
  return (
    <div className="stack">
      <h1 className="display" style={{ fontSize: "2.2rem" }}>
        Asistencia
      </h1>
      <form className="row" method="get">
        <select name="actividad" defaultValue={actividad ?? ""}>
          <option value="">Todas</option>
          {(activities ?? []).map((activity) => (
            <option key={activity.id} value={activity.id}>
              {activity.name}
            </option>
          ))}
        </select>
        <button className="btn btn-gold">Filtrar</button>
        <a className="btn btn-ghost" href="/api/admin/export?tipo=asistencia">
          CSV
        </a>
      </form>
      {(sessions ?? []).length === 0 ? <p className="empty">No hay clases en ese filtro.</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
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
