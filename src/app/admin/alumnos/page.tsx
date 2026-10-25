import type { Metadata } from "next";
import { Avatar } from "@/components/brand/avatar";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { ReleaseFields } from "@/components/kids/family";
import { requireRole } from "@/modules/auth/session";
import { profilesInBarrio } from "@/modules/barrios/members";
import { adminLinkFollow, endFollow } from "@/modules/follow/actions";
import { teenBirthOk } from "@/modules/follow/domain";
import { createChildAsAdmin, inviteGuardian, releaseChild, unlinkGuardian } from "@/modules/kids/actions";
import { todayInArgentina } from "@/lib/time";

export const metadata: Metadata = { title: { absolute: "Alumnos · Musical Club" } };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const ctx = await requireRole(["admin"]);
  const students = await profilesInBarrio(ctx, ["student"], q ?? "");
  const studentIds = students.map((student) => student.id);
  const { data: links } = studentIds.length
    ? await ctx.supabase.from("guardianships").select("child_id, guardian_id, access, ended_at").in("child_id", studentIds)
    : { data: [] };
  const guardianIds = [...new Set((links ?? []).map((link) => link.guardian_id))];
  const { data: guardians } = guardianIds.length
    ? await ctx.supabase.from("profiles").select("id, full_name, email, phone").in("id", guardianIds)
    : { data: [] };
  return (
    <div className="stack">
      <h1 className="display" style={{ fontSize: "2.2rem" }}>
        Alumnos
      </h1>
      <form className="row" method="get">
        <label className="field" style={{ flex: 1 }}>
          <span>Buscar</span>
          <input name="q" defaultValue={q ?? ""} placeholder="Nombre o email" />
        </label>
        <button className="btn btn-gold">Buscar</button>
      </form>
      {(students ?? []).length === 0 ? <p className="empty">No hay alumnos.</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>DNI</th>
            </tr>
          </thead>
          <tbody>
            {(students ?? []).map((student) => (
              <tr key={student.id}>
                <td>
                  <span className="person">
                    <Avatar name={student.full_name || "Alumno"} url={student.avatar_url} size={36} />
                    {student.full_name}
                    {student.account_kind === "kid" ? <span className="badge">Kid</span> : null}
                    {(links ?? []).some((link) => link.child_id === student.id && link.access === "follow" && !link.ended_at) ? (
                      <span className="badge">Seguimiento</span>
                    ) : null}
                  </span>
                </td>
                <td>
                  {student.account_kind === "kid" || (links ?? []).some((link) => link.child_id === student.id)
                    ? (links ?? [])
                        .filter((link) => link.child_id === student.id && !(link.access === "follow" && link.ended_at))
                        .map((link) => {
                          const guardian = guardians?.find((item) => item.id === link.guardian_id);
                          if (!guardian) return link.access === "contact" ? "Contacto" : "Responsable";
                          return [guardian.full_name, guardian.phone, guardian.email, link.access === "contact" ? "contacto" : ""]
                            .filter(Boolean)
                            .join(" · ");
                        })
                        .join(" / ") || student.email
                    : student.email}
                </td>
                <td>{student.phone}</td>
                <td>{student.dni}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="panel stack">
        <h2 className="display" style={{ fontSize: "1.6rem" }}>
          Agregar
        </h2>
        <ActionForm action={createChildAsAdmin} className="stack">
          <label className="field">
            <span>Nombre</span>
            <input name="firstName" required />
          </label>
          <label className="field">
            <span>Apellido</span>
            <input name="lastName" required />
          </label>
          <label className="field">
            <span>Nacimiento</span>
            <input name="birthDate" type="date" required />
          </label>
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" />
          </label>
          <SubmitButton>Agregar</SubmitButton>
        </ActionForm>
      </section>
      {students
        .filter((student) => student.account_kind === "kid")
        .map((student) => (
          <article key={student.id} className="panel stack">
            <h2 className="display" style={{ fontSize: "1.5rem" }}>
              {student.full_name} <span className="badge">Kid</span>
            </h2>
            {(links ?? [])
              .filter((link) => link.child_id === student.id)
              .map((link) => {
                const guardian = guardians?.find((item) => item.id === link.guardian_id);
                return (
                  <ActionForm key={link.guardian_id} action={unlinkGuardian} className="row">
                    <input type="hidden" name="childId" value={student.id} />
                    <input type="hidden" name="guardianId" value={link.guardian_id} />
                    <span style={{ flex: 1 }}>{guardian?.full_name || "Responsable"}</span>
                    <SubmitButton className="btn btn-ghost">Quitar</SubmitButton>
                  </ActionForm>
                );
              })}
            <ActionForm action={inviteGuardian} className="row">
              <input type="hidden" name="childId" value={student.id} />
              <label className="field" style={{ flex: 1 }}>
                <span>Email</span>
                <input name="email" type="email" required />
              </label>
              <SubmitButton className="btn btn-paper">Invitar</SubmitButton>
            </ActionForm>
            <ReleaseFields childId={student.id} action={releaseChild} />
          </article>
        ))}
      {students
        .filter((student) => student.account_kind !== "kid" && teenBirthOk(student.birth_date, todayInArgentina()))
        .map((student) => (
          <article key={student.id} className="panel stack">
            <h2 className="display" style={{ fontSize: "1.5rem" }}>
              {student.full_name}
              {(links ?? []).some((link) => link.child_id === student.id && link.access === "follow" && !link.ended_at) ? (
                <span className="badge">Seguimiento</span>
              ) : null}
            </h2>
            {(links ?? [])
              .filter((link) => link.child_id === student.id && link.access === "follow" && !link.ended_at)
              .map((link) => {
                const guardian = guardians?.find((item) => item.id === link.guardian_id);
                return (
                  <ActionForm key={link.guardian_id} action={endFollow} className="row">
                    <input type="hidden" name="childId" value={student.id} />
                    <input type="hidden" name="guardianId" value={link.guardian_id} />
                    <span style={{ flex: 1 }}>{guardian?.full_name || "Responsable"}</span>
                    <SubmitButton className="btn btn-ghost">Quitar</SubmitButton>
                  </ActionForm>
                );
              })}
            <ActionForm action={adminLinkFollow} className="row">
              <input type="hidden" name="teenId" value={student.id} />
              <label className="field" style={{ flex: 1 }}>
                <span>Email</span>
                <input name="email" type="email" required />
              </label>
              <SubmitButton className="btn btn-paper">Vincular</SubmitButton>
            </ActionForm>
          </article>
        ))}
    </div>
  );
}
