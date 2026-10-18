import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { requireRole } from "@/modules/auth/session";
import { ageGroupCopy, frequencyLabel } from "@/modules/activities/labels";
import { cancelEnrollment, enrollSelf } from "@/modules/enrollments/actions";
import { formatARS } from "@/lib/time";

export default async function StudentActivities() {
  const ctx = await requireRole(["student"]);
  const { data: activities } = await ctx.supabase.from("activities").select("*").eq("status", "active").order("name");
  const { data: mine } = await ctx.supabase.from("enrollments").select("*").eq("student_id", ctx.userId);
  return (
    <div className="stack">
      <h1 className="display" style={{ fontSize: "2.2rem" }}>
        Actividades
      </h1>
      {(activities ?? []).length === 0 ? <p className="empty">Todavía no hay grupos publicados.</p> : null}
      {(activities ?? []).map((activity) => {
        const enrollment = mine?.find((item) => item.activity_id === activity.id);
        const active = enrollment && ["active", "pending", "waitlist"].includes(enrollment.status);
        return (
          <article key={activity.id} className="panel">
            <p className="kicker">{ageGroupCopy[activity.age_group]}</p>
            <h2 className="display" style={{ fontSize: "1.8rem" }}>
              {activity.name}
            </h2>
            <p>{activity.description}</p>
            <p>{activity.schedule_label}</p>
            <p>
              {frequencyLabel[activity.billing_frequency]}
              {activity.price_cents > 0 ? ` · ${formatARS(activity.price_cents)}` : ""}
            </p>
            {active ? (
              <ActionForm action={cancelEnrollment}>
                <input type="hidden" name="enrollmentId" value={enrollment.id} />
                <SubmitButton className="btn btn-ghost">Cancelar inscripción</SubmitButton>
              </ActionForm>
            ) : (
              <ActionForm action={enrollSelf}>
                <input type="hidden" name="activityId" value={activity.id} />
                <SubmitButton>Inscribirme</SubmitButton>
              </ActionForm>
            )}
          </article>
        );
      })}
    </div>
  );
}
