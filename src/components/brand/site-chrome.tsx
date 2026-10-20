import Link from "next/link";
import { Logo } from "./logo";
import { copy } from "@/modules/cms/content";
import { getSessionContext, homeFor } from "@/modules/auth/session";

export async function SiteHeader() {
  const session = await getSessionContext();
  const space = session ? homeFor(session.role) : "/ingresar";
  const spaceLabel = session ? "Mi espacio" : "Ingresar";
  return (
    <header className="site-header">
      <Logo />
      <nav className="nav nav-desktop" aria-label="Principal">
        <Link href="/#experiencia">La propuesta</Link>
        <Link href="/contacto">Contacto</Link>
        <Link href={space}>{spaceLabel}</Link>
      </nav>
      <details className="nav-toggle">
        <summary>Menú</summary>
        <nav aria-label="Principal móvil">
          <Link href="/#experiencia">La propuesta</Link>
          <Link href="/contacto">Contacto</Link>
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
        <Logo size="lg" />
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
