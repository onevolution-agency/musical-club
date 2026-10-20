import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { requireRole, scopeBarrio } from "@/modules/auth/session";
import { profilesInBarrio } from "@/modules/barrios/members";
import { adminEnroll, setEnrollmentStatus } from "@/modules/enrollments/actions";
import { todayInArgentina } from "@/lib/time";
import type { EnrollmentStatus } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: { absolute: "Inscripciones · Musical Club" } };

export default async function EnrollmentsPage({ searchParams }: { searchParams: Promise<{ estado?: string; actividad?: string }> }) {
  const filters = await searchParams;
  const ctx = await requireRole(["admin"]);
  const statuses: EnrollmentStatus[] = ["pending", "active", "waitlist", "cancelled", "completed"];
  let query = scopeBarrio(ctx.supabase.from("enrollments").select("*").order("created_at", { ascending: false }).limit(200), ctx.barrioId);
  if (filters.estado && statuses.includes(filters.estado as EnrollmentStatus)) {
    query = query.eq("status", filters.estado as EnrollmentStatus);
  }
  if (filters.actividad) query = query.eq("activity_id", filters.actividad);
  const { data: enrollments } = await query;
  const { data: activities } = await scopeBarrio(ctx.supabase.from("activities").select("id, name"), ctx.barrioId);
  const students = await profilesInBarrio(ctx, ["student"]);
  return (
    <div className="stack">
      <h1 className="display" style={{ fontSize: "2.2rem" }}>
        Inscripciones
      </h1>
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
          <option value="">Todos los estados</option>
          <option value="active">Activa</option>
          <option value="pending">Pendiente</option>
          <option value="waitlist">Lista de espera</option>
          <option value="cancelled">Cancelada</option>
          <option value="completed">Completada</option>
        </select>
        <button className="btn btn-gold">Filtrar</button>
      </form>
      <ActionForm action={adminEnroll} className="panel">
        <h2 className="display" style={{ fontSize: "1.4rem" }}>
          Inscribir
        </h2>
        <label className="field">
          <span>Alumno</span>
          <select name="studentId" required defaultValue="">
            <option value="" disabled>
              Elegí
            </option>
            {(students ?? []).map((student) => (
              <option key={student.id} value={student.id}>
                {student.full_name || student.email}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Actividad</span>
          <select name="activityId" required defaultValue="">
            <option value="" disabled>
              Elegí
            </option>
            {(activities ?? []).map((activity) => (
              <option key={activity.id} value={activity.id}>
                {activity.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Empieza</span>
          <input type="date" name="startsOn" defaultValue={todayInArgentina()} required />
        </label>
        <SubmitButton>Inscribir</SubmitButton>
      </ActionForm>
      {(enrollments ?? []).length === 0 ? <p className="empty">No hay inscripciones.</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Alumno</th>
              <th>Actividad</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {(enrollments ?? []).map((enrollment) => (
              <tr key={enrollment.id}>
                <td>{students?.find((student) => student.id === enrollment.student_id)?.full_name}</td>
                <td>{activities?.find((activity) => activity.id === enrollment.activity_id)?.name}</td>
                <td>
                  <ActionForm action={setEnrollmentStatus} className="row">
                    <input type="hidden" name="enrollmentId" value={enrollment.id} />
                    <select name="status" defaultValue={enrollment.status}>
                      <option value="active">Activa</option>
                      <option value="pending">Pendiente</option>
                      <option value="waitlist">Lista de espera</option>
                      <option value="cancelled">Cancelada</option>
                      <option value="completed">Completada</option>
                    </select>
                    <SubmitButton className="btn btn-ghost">OK</SubmitButton>
                  </ActionForm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
