import { Avatar } from "@/components/brand/avatar";
import { requireRole } from "@/modules/auth/session";
import { profilesInBarrio } from "@/modules/barrios/members";

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const ctx = await requireRole(["admin"]);
  const students = await profilesInBarrio(ctx, ["student"], q ?? "");
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
      {(students ?? []).length === 0 ? <p className="empty">No hay alumnos con ese filtro.</p> : null}
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
                  </span>
                </td>
                <td>{student.email}</td>
                <td>{student.phone}</td>
                <td>{student.dni}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
