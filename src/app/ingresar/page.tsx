import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { isSupabaseConfigured } from "@/lib/env";
import { signInWithMagicLink, signInWithPassword } from "@/modules/auth/actions";
import { getSessionContext, homeFor, safeNext } from "@/modules/auth/session";

export const metadata: Metadata = { title: "Ingresar", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await getSessionContext();
  const params = await searchParams;
  if (session) redirect(safeNext(params.next, homeFor(session.profile.role)));
  return (
    <main id="contenido" className="section">
      <div className="wrap" style={{ maxWidth: 520 }}>
        <Logo />
        <h1 className="display" style={{ fontSize: "3rem", marginTop: "1rem" }}>
          Ingresá
        </h1>
        {!isSupabaseConfigured() ? (
          <p className="form-error" role="status">
            El ingreso no está disponible.
          </p>
        ) : null}
        <ActionForm action={signInWithPassword} className="panel" >
          <input type="hidden" name="next" value={params.next ?? ""} />
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input name="password" type="password" autoComplete="current-password" required minLength={8} />
          </label>
          <SubmitButton>Entrar</SubmitButton>
        </ActionForm>
        <ActionForm action={signInWithMagicLink} className="panel" >
          <h2 className="display" style={{ fontSize: "1.6rem" }}>
            Entrá con un enlace
          </h2>
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <SubmitButton className="btn btn-gold">Mandame el enlace</SubmitButton>
        </ActionForm>
        <p>
          ¿Primera vez? <Link href="/registro">Registrate</Link>
        </p>
      </div>
    </main>
  );
}
