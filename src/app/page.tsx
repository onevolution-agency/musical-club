import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/brand/site-chrome";
import { BrushStar, Scribble } from "@/components/brand/marks";
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
          <div className="hero-mark" aria-hidden="true">
            <BrushStar />
          </div>
          <h1 className="display">
            {copy.heroTitle}
            <span className="banner">{copy.heroBanner}</span>
          </h1>
          <Scribble className="scribble" />
          <p className="byline">{copy.byline}</p>
        </section>

        <section className="section" id="experiencia">
          <div className="wrap sheet-wrap">
            <span className="tape tape-tr" aria-hidden="true" />
            <div className="panel sheet">
              <h2 className="display statement boxed">{copy.experience}</h2>
            </div>
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

        <section className="section tight" aria-hidden="true">
          <div className="wrap sticker-row">
            <span className="sticker sticker-ink">
              <BrushStar />
            </span>
            <span className="tape tape-inline" />
            <span className="sticker sticker-red">
              <BrushStar />
            </span>
            <span className="sticker sticker-paper">
              <BrushStar />
            </span>
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
              <span className="tape tape-tl" aria-hidden="true" />
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
            <div className="torn-edge" aria-hidden="true" />
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
