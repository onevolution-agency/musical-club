import Image from "next/image";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/brand/site-chrome";
import { copy } from "@/modules/cms/content";
import { JsonLd, organizationGraph } from "@/modules/cms/jsonld";
import { siteUrl } from "@/lib/env";

export default function HomePage() {
  return (
    <>
      <JsonLd data={organizationGraph(siteUrl())} />
      <SiteHeader />
      <main id="contenido">
        <section className="hero wrap">
          <h1 className="display">
            {copy.heroTitle}
            <span className="banner">{copy.heroBanner}</span>
          </h1>
          <figure className="torn hero-photo">
            <Image
              src="/media/hero.jpg"
              alt="Elenco de comedia musical en escena, con vestuario de los años 60"
              width={1544}
              height={850}
              priority
              sizes="(min-width: 900px) 920px, 100vw"
            />
          </figure>
          <p className="byline">{copy.byline}</p>
        </section>

        <section className="section" id="experiencia">
          <div className="wrap panel">
            <h2 className="display statement">{copy.experience}</h2>
          </div>
        </section>

        <section className="section">
          <div className="wrap grid-2">
            <article className="panel">
              <p className="kicker">{copy.conceptKicker}</p>
              <h2 className="display">{copy.conceptTitle}</h2>
              <ul className="stars">
                {copy.concept.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="panel">
              <p className="kicker">{copy.cycleKicker}</p>
              <h2 className="display">{copy.cycleTitle}</h2>
              <ul className="stars">
                {copy.cycle.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className="section">
          <div className="wrap photo-row">
            <figure className="torn">
              <Image
                src="/media/photo-family.jpg"
                alt="Familias cantando juntas en un número de comedia musical"
                width={998}
                height={604}
                sizes="(min-width: 800px) 50vw, 100vw"
              />
            </figure>
            <figure className="torn">
              <Image
                src="/media/photo-dance.jpg"
                alt="Parejas bailando en un salón con vestuario retro"
                width={722}
                height={606}
                sizes="(min-width: 800px) 40vw, 100vw"
              />
            </figure>
          </div>
        </section>

        <section className="section">
          <div className="wrap grid-2">
            <article className="panel">
              <p className="kicker">{copy.benefitsKicker}</p>
              <h2 className="display">{copy.benefitsTitle}</h2>
              <ul className="stars">
                {copy.benefits.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="red-panel cta-block" id="integrar">
              <h2 className="display">{copy.ctaTitle}</h2>
              {copy.ctaBody.map((item) => (
                <p key={item}>{item}</p>
              ))}
              <Link className="btn btn-paper" href="/contacto">
                {copy.ctaTitle}
              </Link>
            </article>
          </div>
        </section>

        <section className="section" id="logistica">
          <div className="wrap">
            <h2 className="display statement">{copy.opsTitle}</h2>
            <p className="kicker">{copy.opsIntro}</p>
            <figure className="torn" style={{ margin: "1rem 0" }}>
              <Image
                src="/media/photo-stage.jpg"
                alt="Elenco completo en el escenario bajo una lluvia de confeti"
                width={1536}
                height={642}
                sizes="100vw"
              />
            </figure>
            <div className="ops-grid">
              <Ops title={copy.formatTitle} items={copy.format} />
              <Ops title={copy.agesTitle} items={copy.ages} />
              <Ops title={copy.techTitle} items={copy.tech} />
              <Ops title={copy.contractTitle} items={copy.contract} />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Ops({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <article className="panel">
      <h3 className="display">{title}</h3>
      <ul className="stars">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}
