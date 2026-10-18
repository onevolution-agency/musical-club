import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { signUp } from "@/modules/auth/actions";

export const metadata: Metadata = { title: "Registro", robots: { index: false, follow: false } };

export default function RegisterPage() {
  return (
    <main id="contenido" className="section">
      <div className="wrap" style={{ maxWidth: 520 }}>
        <Logo />
        <h1 className="display" style={{ fontSize: "3rem" }}>
          Creá tu cuenta
        </h1>
        <p>La cuenta nueva entra como alumno. A los profes los invita la administración.</p>
        <ActionForm action={signUp} className="panel">
          <label className="field">
            <span>Nombre y apellido</span>
            <input name="fullName" required autoComplete="name" />
          </label>
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input name="password" type="password" required minLength={8} autoComplete="new-password" />
          </label>
          <SubmitButton>Registrarme</SubmitButton>
        </ActionForm>
        <p>
          ¿Ya tenés cuenta? <Link href="/ingresar">Ingresá</Link>
        </p>
      </div>
    </main>
  );
}
