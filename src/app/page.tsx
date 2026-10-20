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
          <div className="hero-mark">
            <Image src="/brand/star.png" alt="" width={692} height={613} priority />
          </div>
          <h1 className="display">
            {copy.heroTitle}
            <span className="banner">{copy.heroBanner}</span>
          </h1>
          <p className="byline">{copy.byline}</p>
        </section>

        <section className="section" id="experiencia">
          <div className="wrap">
            <h2 className="display statement boxed">{copy.experience}</h2>
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
