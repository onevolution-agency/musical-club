import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { signOut } from "@/modules/auth/actions";
import type { Role } from "@/lib/supabase/database.types";

const links: Record<Role, { href: string; label: string; tab?: boolean }[]> = {
  student: [
    { href: "/alumno", label: "Inicio", tab: true },
    { href: "/alumno/actividades", label: "Actividades", tab: true },
    { href: "/alumno/cuotas", label: "Cuotas", tab: true },
    { href: "/alumno/qr", label: "Mi QR", tab: true },
    { href: "/alumno/perfil", label: "Perfil" },
  ],
  teacher: [
    { href: "/profesor", label: "Clases", tab: true },
    { href: "/profesor/asistencia", label: "Historial", tab: true },
  ],
  admin: [
    { href: "/admin", label: "Tablero", tab: true },
    { href: "/admin/actividades", label: "Actividades" },
    { href: "/admin/profesores", label: "Profes" },
    { href: "/admin/alumnos", label: "Alumnos" },
    { href: "/admin/inscripciones", label: "Inscripciones" },
    { href: "/admin/cuotas", label: "Cuotas", tab: true },
    { href: "/admin/pagos", label: "Pagos", tab: true },
    { href: "/admin/asistencia", label: "Asistencia", tab: true },
    { href: "/admin/consultas", label: "Consultas" },
  ],
};

export function AppShell({
  role,
  title,
  children,
}: {
  role: Role;
  title: string;
  children: React.ReactNode;
}) {
  const items = links[role];
  return (
    <div className="app-shell">
      <aside className="app-side">
        <Logo size="sm" />
        <nav aria-label="Secciones" style={{ marginTop: "1rem" }}>
          {items.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="app-main">
        <header className="app-top">
          <div>
            <p className="kicker" style={{ margin: 0 }}>
              {role === "admin" ? "Administración" : role === "teacher" ? "Profesorado" : "Alumno"}
            </p>
            <p className="display" style={{ fontSize: "2rem", margin: 0 }}>
              {title}
            </p>
          </div>
          <form action={signOut}>
            <button className="btn btn-ghost">Salir</button>
          </form>
        </header>
        {children}
      </div>
      <nav className="tabbar" aria-label="Atajos">
        {items
          .filter((item) => item.tab)
          .map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
      </nav>
    </div>
  );
}
