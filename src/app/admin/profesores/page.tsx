import type { Metadata } from "next";
import { Avatar } from "@/components/brand/avatar";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { profilesInBarrio } from "@/modules/barrios/members";
import { requireRole } from "@/modules/auth/session";
import { inviteStaff, setUserRole } from "@/modules/teachers/actions";

export const metadata: Metadata = { title: { absolute: "Profesores · Musical Club" } };

export default async function TeachersPage() {
  const ctx = await requireRole(["admin"]);
  const teachers = await profilesInBarrio(ctx, ["teacher", "admin"]);
  return (
    <div className="stack">
      <h1 className="display" style={{ fontSize: "2.2rem" }}>
        Profes y admins
      </h1>
      <ActionForm action={inviteStaff} className="panel">
        <label className="field">
          <span>Nombre</span>
          <input name="fullName" required />
        </label>
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" required />
        </label>
        <label className="field">
          <span>Rol</span>
          <select name="role" defaultValue="teacher">
            <option value="teacher">Profesor</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <SubmitButton>Invitar</SubmitButton>
      </ActionForm>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
            </tr>
          </thead>
          <tbody>
            {(teachers ?? []).map((person) => (
              <tr key={person.id}>
                <td>
                  <span className="person">
                    <Avatar name={person.full_name || "Profe"} url={person.avatar_url} size={36} />
                    {person.full_name}
                  </span>
                </td>
                <td>{person.email}</td>
                <td>
                  <ActionForm action={setUserRole} className="row">
                    <input type="hidden" name="userId" value={person.id} />
                    <select name="role" defaultValue={person.membershipRole}>
                      <option value="teacher">Profesor</option>
                      <option value="admin">Admin</option>
                      <option value="student">Alumno</option>
                    </select>
                    <SubmitButton className="btn btn-ghost">Guardar</SubmitButton>
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
