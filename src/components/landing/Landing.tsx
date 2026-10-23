import type { CSSProperties } from "react";
import Link from "next/link";
import { Pictogram } from "./Pictogram";
import { IN_DEVELOPMENT, LIVE_NOW, PRINCIPLES, ROSTER_COPY } from "@/content/landing";
import { PERSONAS, PERSONA_SLUGS } from "@/personas";

const tint = (name: string): CSSProperties => ({ "--c": `var(${name})` }) as unknown as CSSProperties;

function Brand(): React.JSX.Element {
  return (
    <>
      <span className="mark" aria-hidden="true"><i /><i /><i /><i /><i /></span>
      <span className="wordmark">ALTER EGO</span>
    </>
  );
}

export default function Landing(): React.JSX.Element {
  return (
    <div className="ae">
      <a className="skip" href="#main">Skip to content</a>
      <header className="top">
        <div className="wrap top-inner">
          <Link className="brand" href="/" aria-label="ALTER EGO home"><Brand /></Link>
          <nav className="nav" aria-label="Sections">
            <a href="#now">Live now</a><a href="#roster">Roster</a><a href="#next">In development</a>
          </nav>
          <div className="top-actions">
            <Link className="btn btn-ghost btn-sm" href="/login">Sign in</Link>
            <Link className="btn btn-primary btn-sm" href="/register">Join free</Link>
          </div>
        </div>
      </header>

      <main id="main">
        <section className="hero" aria-labelledby="hero-h">
          <div className="wrap">
            <h1 id="hero-h">Every legend has an alter ego. Earn yours.</h1>
            <div className="hero-row">
              <div>
                <p className="hero-lead">ALTER EGO is where fans practise sporting judgement. Make a call before the outcome, get graded on the decision rather than the luck, and compare reads with your crew. Free to play, with no money involved, ever.</p>
                <div className="cta-row">
                  <Link className="btn btn-primary" href="/onboarding">See how it works</Link>
                  <Link className="btn btn-ghost" href="/register">Start a crew</Link>
                </div>
              </div>
            </div>
            <ul className="wall" aria-label="The roster">
              {PERSONA_SLUGS.map((key, i) => {
                const p = PERSONAS[key];
                return (
                  <li key={key} style={{ ...tint(p.colorToken), ["--i" as string]: i } as CSSProperties}>
                    <a href={`#r-${key}`}>
                      <span className="band"><Pictogram sport={p.sportKey} /></span>
                      <span className="cap">{p.name}</span>
                      <span className="cap-sport">{p.sport}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="sec" id="now" aria-labelledby="now-h">
          <div className="wrap">
            <h2 className="h2" id="now-h">Live now</h2>
            <div className="pr-grid">
              {LIVE_NOW.map((x) => (
                <div className="pr" key={x.title} style={tint("--architect")}>
                  <h3>{x.title}</h3>
                  <p>{x.body}</p>
                  <p><Link href={x.href}>{x.cta}</Link></p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="sec" id="roster" aria-labelledby="roster-h">
          <div className="wrap">
            <div className="sec-head">
              <h2 id="roster-h">The roster</h2>
              <p className="lead">Five original AI analysts, one per sport. They are characters with their own way of reading the game, not impressions of real athletes.</p>
            </div>
            <div className="cards">
              {PERSONA_SLUGS.map((key) => {
                const p = PERSONAS[key];
                const r = ROSTER_COPY[key];
                return (
                  <article className="card" id={`r-${key}`} key={key} style={tint(p.colorToken)}>
                    <div className="card-band"><Pictogram sport={p.sportKey} /></div>
                    <div className="card-body">
                      <h3>{p.name}</h3>
                      <p className="card-sport">{p.sport} · AI analyst</p>
                      <dl>
                        <div><dt>Mentality</dt><dd>{r.mentality}</dd></div>
                        <div><dt>Signature tool</dt><dd>{r.tool}</dd></div>
                      </dl>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="sec" id="next" aria-labelledby="next-h">
          <div className="wrap">
            <h2 className="h2" id="next-h">In development</h2>
            <p className="lead">Not available yet. We’ll open each one when it works with real, sourced data.</p>
            <ol className="steps">
              {IN_DEVELOPMENT.map((s, i) => (
                <li key={s.title} style={tint("--professor")}><span className="step-n">{i + 1}</span><h3>{s.title}</h3><p>{s.body}</p></li>
              ))}
            </ol>
          </div>
        </section>

        <section className="sec" aria-labelledby="pr-h">
          <div className="wrap">
            <h2 className="h2" id="pr-h">What we hold to</h2>
            <div className="pr-grid">
              {PRINCIPLES.map((p) => <div className="pr" key={p.title} style={tint(p.color)}><h3>{p.title}</h3><p>{p.body}</p></div>)}
            </div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="wrap">
          <span className="brand"><Brand /></span>
          <p><Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/attributions">Attributions</Link> · <Link href="/ai">How AI is used</Link></p>
          <p>ALTER EGO is in beta. The analysts are AI characters. No affiliation with or endorsement by any athlete, team or league is implied.</p>
        </div>
      </footer>
    </div>
  );
}
