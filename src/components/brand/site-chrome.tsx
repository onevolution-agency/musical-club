import Link from "next/link";
import { BarrioSwitcher } from "./barrio-switcher";
import { Logo } from "./logo";
import { copy } from "@/modules/cms/content";
import { listPublicBarrios, publicBarrioSlug } from "@/modules/barrios/public";
import { getSessionContext, homeFor } from "@/modules/auth/session";

export async function SiteHeader() {
  const session = await getSessionContext();
  const barrios = session?.barrios.length ? session.barrios : await listPublicBarrios();
  const current = session?.barrio?.slug ?? (await publicBarrioSlug());
  const space = session ? homeFor(session.role) : "/ingresar";
  const spaceLabel = session ? "Mi espacio" : "Ingresar";
  const switcher = (
    <BarrioSwitcher
      options={barrios.map((barrio) => ({ slug: barrio.slug, name: barrio.name }))}
      current={current}
      allowAll={session?.profile.role === "super_admin"}
    />
  );
  return (
    <header className="site-header">
      <Logo />
      <nav className="nav nav-desktop" aria-label="Principal">
        <Link href="/#experiencia">La propuesta</Link>
        <Link href="/actividades">Actividades</Link>
        <Link href="/contacto">Contacto</Link>
        {switcher}
        <Link href={space}>{spaceLabel}</Link>
      </nav>
      <details className="nav-toggle">
        <summary>Menú</summary>
        <nav aria-label="Principal móvil">
          <Link href="/#experiencia">La propuesta</Link>
          <Link href="/actividades">Actividades</Link>
          <Link href="/contacto">Contacto</Link>
          {switcher}
          <Link href={space}>{spaceLabel}</Link>
        </nav>
      </details>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <p className="display statement">{copy.closing}</p>
        <p className="credits">{copy.credits}</p>
        <p className="row">
          <a href="/llms.txt">llms.txt</a>
          <Link href="/contacto">{copy.ctaTitle}</Link>
        </p>
      </div>
    </footer>
  );
}
