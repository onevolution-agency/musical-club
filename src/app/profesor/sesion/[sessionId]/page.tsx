import type { Metadata } from "next";
import { Avatar } from "@/components/brand/avatar";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { requireRole } from "@/modules/auth/session";
import { closeSession, markManual } from "@/modules/attendance/actions";
import { Scanner } from "@/modules/attendance/scanner";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: { absolute: "Sesión · Musical Club" } };

export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const ctx = await requireRole(["teacher", "admin"]);
  const { data: session } = await ctx.supabase.from("class_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (!session) notFound();
  const { data: activity } = await ctx.supabase.from("activities").select("name").eq("id", session.activity_id).maybeSingle();
  const { data: enrollments } = await ctx.supabase
    .from("enrollments")
    .select("student_id, status")
    .eq("activity_id", session.activity_id)
    .eq("status", "active");
  const studentIds = (enrollments ?? []).map((row) => row.student_id);
  const { data: profiles } = studentIds.length
    ? await ctx.supabase.from("profiles").select("id, full_name, avatar_url, account_kind").in("id", studentIds)
    : { data: [] };
  const { data: links } = studentIds.length
    ? await ctx.supabase.from("guardianships").select("child_id, guardian_id").in("child_id", studentIds)
    : { data: [] };
  const guardianIds = [...new Set((links ?? []).map((link) => link.guardian_id))];
  const { data: guardians } = guardianIds.length
    ? await ctx.supabase.from("profiles").select("id, full_name, phone, email").in("id", guardianIds)
    : { data: [] };
  const { data: marks } = await ctx.supabase.from("attendance_marks").select("student_id").eq("session_id", sessionId);
  const present = new Set((marks ?? []).map((mark) => mark.student_id));
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const contactFor = (studentId: string) =>
    (links ?? [])
      .filter((link) => link.child_id === studentId)
      .map((link) => {
        const guardian = guardians?.find((item) => item.id === link.guardian_id);
        if (!guardian) return "";
        return [guardian.full_name, guardian.phone || guardian.email].filter(Boolean).join(" · ");
      })
      .filter(Boolean)
      .join(" / ");
  const roster = (enrollments ?? [])
    .map((enrollment) => {
      const profile = names.get(enrollment.student_id);
      return {
        id: enrollment.student_id,
        name: profile?.full_name || "Sin nombre",
        avatarUrl: profile?.avatar_url ?? null,
        present: present.has(enrollment.student_id),
        kid: profile?.account_kind === "kid",
        contact: profile?.account_kind === "kid" ? contactFor(enrollment.student_id) : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  return (
    <div className="stack">
      <h1 className="display" style={{ fontSize: "2rem" }}>
        {activity?.name ?? "Clase"}
      </h1>
      <p>{session.status === "open" ? "Lista abierta" : "Lista cerrada"} · {roster.filter((row) => row.present).length}/{roster.length} presentes</p>
      {session.status === "open" ? (
        <>
          <Scanner sessionId={sessionId} initialRoster={roster} />
          <section className="stack">
            <h2 className="display" style={{ fontSize: "1.5rem" }}>
              Marca manual
            </h2>
            {roster.length === 0 ? <p className="empty">No hay alumnos.</p> : null}
            {roster.map((row) => (
              <ActionForm key={row.id} action={markManual} className="row">
                <input type="hidden" name="sessionId" value={sessionId} />
                <input type="hidden" name="studentId" value={row.id} />
                <span className="person" style={{ flex: 1 }}>
                  <Avatar name={row.name} url={row.avatarUrl} size={44} />
                  {row.name}
                  {row.kid ? <span className="badge">Kid</span> : null}
                  {row.contact ? <span className="hint">{row.contact}</span> : null}
                </span>
                <SubmitButton className="btn btn-paper">{row.present ? "Ya está" : "Presente"}</SubmitButton>
              </ActionForm>
            ))}
          </section>
          <ActionForm action={closeSession}>
            <input type="hidden" name="sessionId" value={sessionId} />
            <SubmitButton className="btn btn-ghost">Cerrar clase</SubmitButton>
          </ActionForm>
        </>
      ) : (
        <ul className="stars">
          {roster.map((row) => (
            <li key={row.id}>
              <span className="person">
                <Avatar name={row.name} url={row.avatarUrl} size={36} />
                {row.name} {row.kid ? <span className="badge">Kid</span> : null} {row.present ? "· presente" : "· ausente"}
                {row.contact ? <span className="hint">{row.contact}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
