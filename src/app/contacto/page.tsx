import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/brand/site-chrome";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { copy } from "@/modules/cms/content";
import { sendInquiry } from "@/modules/cms/actions";

export const metadata: Metadata = {
  title: "Contacto",
  description: copy.ctaTitle,
  alternates: { canonical: "/contacto" },
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main id="contenido" className="section">
        <div className="wrap grid-2">
          <article className="red-panel cta-block">
            <h1 className="display">{copy.ctaTitle}</h1>
            {copy.ctaBody.map((item) => (
              <p key={item}>{item}</p>
            ))}
            <p className="credits">{copy.credits}</p>
          </article>
          <ActionForm action={sendInquiry} className="panel">
            <label className="field">
              <span>Nombre</span>
              <input name="name" required autoComplete="name" />
            </label>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" required autoComplete="email" />
            </label>
            <label className="field">
              <span>Teléfono</span>
              <input name="phone" autoComplete="tel" />
            </label>
            <label className="field">
              <span>Country o barrio</span>
              <input name="community" />
            </label>
            <label className="field">
              <span>Mensaje</span>
              <textarea name="message" required minLength={10} />
            </label>
            <SubmitButton>Enviar consulta</SubmitButton>
          </ActionForm>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
