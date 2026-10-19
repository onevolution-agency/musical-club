import Link from "next/link";
import { Avatar } from "@/components/brand/avatar";
import { BarrioSwitcher } from "@/components/brand/barrio-switcher";
import { Logo } from "@/components/brand/logo";
import { signOut } from "@/modules/auth/actions";
import type { SessionContext } from "@/modules/auth/session";
import type { Role } from "@/lib/supabase/database.types";

const links: Record<"student" | "teacher" | "admin", { href: string; label: string; tab?: boolean }[]> = {
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
    { href: "/profesor/perfil", label: "Perfil" },
  ],
  admin: [
    { href: "/admin", label: "Tablero", tab: true },
    { href: "/admin/barrios", label: "Barrios" },
    { href: "/admin/actividades", label: "Actividades" },
    { href: "/admin/profesores", label: "Profes" },
    { href: "/admin/alumnos", label: "Alumnos" },
    { href: "/admin/inscripciones", label: "Inscripciones" },
    { href: "/admin/cuotas", label: "Cuotas", tab: true },
    { href: "/admin/pagos", label: "Pagos", tab: true },
    { href: "/admin/asistencia", label: "Asistencia", tab: true },
    { href: "/admin/consultas", label: "Consultas" },
    { href: "/admin/perfil", label: "Perfil" },
  ],
};

function navRole(role: Role): "student" | "teacher" | "admin" {
  if (role === "teacher") return "teacher";
  if (role === "student") return "student";
  return "admin";
}

export function AppShell({
  ctx,
  nav,
  title,
  children,
}: {
  ctx: SessionContext;
  nav?: Role;
  title: string;
  children: React.ReactNode;
}) {
  const role = navRole(nav ?? ctx.role);
  const items = links[role];
  const kicker = role === "admin" ? "Administración" : role === "teacher" ? "Profesorado" : "Alumno";
  return (
    <div className="app-shell">
      <aside className="app-side">
        <Logo size="sm" />
        <nav aria-label="Secciones">
          {items.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="app-main">
        <header className="app-top">
          <div className="row">
            <Avatar name={ctx.profile.full_name || "Musical Club"} url={ctx.profile.avatar_url} size={48} />
            <div>
              <p className="kicker" style={{ margin: 0 }}>
                {kicker}
                {ctx.barrio ? ` · ${ctx.barrio.name}` : ctx.profile.role === "super_admin" ? " · Todos los barrios" : ""}
              </p>
              <p className="display" style={{ fontSize: "2rem", margin: 0 }}>
                {title}
              </p>
            </div>
          </div>
          <div className="row">
            <BarrioSwitcher
              options={ctx.barrios.map((barrio) => ({ slug: barrio.slug, name: barrio.name }))}
              current={ctx.barrio?.slug ?? null}
              allowAll={ctx.profile.role === "super_admin"}
            />
            <form action={signOut}>
              <button className="btn btn-ghost">Salir</button>
            </form>
          </div>
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
