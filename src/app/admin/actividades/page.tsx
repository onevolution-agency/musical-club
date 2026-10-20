import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { requireRole, scopeBarrio } from "@/modules/auth/session";
import { profilesInBarrio } from "@/modules/barrios/members";
import { saveActivity, assignTeachers } from "@/modules/activities/actions";
import { ageGroupCopy, frequencyLabel, weekdays } from "@/modules/activities/labels";
import { copy } from "@/modules/cms/content";

export const metadata: Metadata = { title: { absolute: "Actividades · Musical Club" } };

export default async function AdminActivities({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const ctx = await requireRole(["admin"]);
  const { data: activities } = await scopeBarrio(ctx.supabase.from("activities").select("*").order("name"), ctx.barrioId);
  const current = activities?.find((activity) => activity.id === id);
  const teachers = await profilesInBarrio(ctx, ["teacher"]);
  const { data: assigned } = current
    ? await ctx.supabase.from("activity_teachers").select("teacher_id").eq("activity_id", current.id)
    : { data: [] };
  const selected = new Set((assigned ?? []).map((row) => row.teacher_id));
  return (
    <div className="stack">
      <h1 className="display" style={{ fontSize: "2.2rem" }}>
        Actividades
      </h1>
      <ActionForm action={saveActivity} className="panel">
        {current ? <input type="hidden" name="id" value={current.id} /> : null}
        <label className="field">
          <span>Nombre</span>
          <input name="name" required defaultValue={current?.name ?? ""} />
        </label>
        <label className="field">
          <span>Descripción</span>
          <textarea name="description" required defaultValue={current?.description ?? copy.ages[0]} />
        </label>
        <label className="field">
          <span>Grupo</span>
          <select name="ageGroup" defaultValue={current?.age_group ?? "kids"}>
            <option value="kids">{ageGroupCopy.kids}</option>
            <option value="youth_adults">{ageGroupCopy.youth_adults}</option>
          </select>
        </label>
        <label className="field">
          <span>Horario</span>
          <input name="scheduleLabel" required defaultValue={current?.schedule_label ?? copy.format[1]} />
        </label>
        <label className="field">
          <span>Día</span>
          <select name="weekday" defaultValue={current?.weekday ?? ""}>
            <option value="">Sin día</option>
            {weekdays.map((day, index) => (
              <option key={day} value={index}>
                {day}
              </option>
            ))}
          </select>
        </label>
        <div className="row">
          <label className="field">
            <span>Desde</span>
            <input name="startTime" type="time" defaultValue={current?.start_time?.slice(0, 5) ?? ""} />
          </label>
          <label className="field">
            <span>Hasta</span>
            <input name="endTime" type="time" defaultValue={current?.end_time?.slice(0, 5) ?? ""} />
          </label>
        </div>
        <label className="field">
          <span>Lugar</span>
          <input name="location" required defaultValue={current?.location ?? copy.tech[0].replace("Espacio físico: ", "")} />
        </label>
        <label className="field">
          <span>Cupo</span>
          <input name="capacity" type="number" min={1} required defaultValue={current?.capacity ?? 24} />
        </label>
        <label className="field">
          <span>Precio de la cuota (ARS)</span>
          <input name="pricePesos" type="number" min={0} step="0.01" required defaultValue={(current?.price_cents ?? 0) / 100} />
        </label>
        <label className="field">
          <span>Frecuencia</span>
          <select name="billingFrequency" defaultValue={current?.billing_frequency ?? "monthly"}>
            <option value="monthly">{frequencyLabel.monthly}</option>
            <option value="biweekly">{frequencyLabel.biweekly}</option>
          </select>
        </label>
        <label className="field">
          <span>Estado</span>
          <select name="status" defaultValue={current?.status ?? "active"}>
            <option value="draft">Borrador</option>
            <option value="active">Activa</option>
            <option value="archived">Archivada</option>
          </select>
        </label>
        <SubmitButton>{current ? "Guardar cambios" : "Crear actividad"}</SubmitButton>
      </ActionForm>
      {current ? (
        <ActionForm action={assignTeachers} className="panel">
          <h2 className="display" style={{ fontSize: "1.4rem" }}>
            Profes de {current.name}
          </h2>
          <input type="hidden" name="activityId" value={current.id} />
          {(teachers ?? []).length === 0 ? <p>No hay profes.</p> : null}
          {(teachers ?? []).map((teacher) => (
            <label key={teacher.id} className="row">
              <input type="checkbox" name="teacherId" value={teacher.id} defaultChecked={selected.has(teacher.id)} />
              {teacher.full_name || teacher.email}
            </label>
          ))}
          <SubmitButton className="btn btn-gold">Asignar profes</SubmitButton>
        </ActionForm>
      ) : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Estado</th>
              <th>Frecuencia</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(activities ?? []).map((activity) => (
              <tr key={activity.id}>
                <td>{activity.name}</td>
                <td>{activity.status}</td>
                <td>{frequencyLabel[activity.billing_frequency]}</td>
                <td>
                  <a href={`/admin/actividades?id=${activity.id}`}>Editar</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
