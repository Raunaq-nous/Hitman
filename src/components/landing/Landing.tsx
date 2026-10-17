"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import Link from "next/link";
import { Pictogram } from "./Pictogram";
import {
  BRIEF, SCENARIOS, PERSONAS, PERSONA_ORDER, ROSTER, PRINCIPLES, STEPS,
  type Depth, type PersonaKey,
} from "@/content/landing";

type Result = { pick: 0 | 1; grade: number; win: boolean };
type Reading = { key: PersonaKey; why: string; sharp: string; style: string };

const START_RATING = 1500;
const tint = (name: string) => ({ "--c": `var(${name})` }) as unknown as CSSProperties;
const signed = (n: number) => (n < 0 ? `\u2212${Math.abs(n)}` : `+${n}`);
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Spark({ points }: { points: number[] }) {
  const w = 120, h = 56, p = 5;
  const step = (w - p * 2) / (points.length - 1);
  const y = (v: number) => Number((h - p - (v / 100) * (h - p * 2)).toFixed(1));
  const coords = points.map((v, i) => `${(p + i * step).toFixed(1)},${y(v)}`).join(" ");
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <line className="mid" x1={p} x2={w - p} y1={y(50)} y2={y(50)} />
      <polyline points={coords} vectorEffect="non-scaling-stroke" />
      <circle cx={Number((p + (points.length - 1) * step).toFixed(1))} cy={y(points[points.length - 1])} r={3.2} />
    </svg>
  );
}

function Redact({ open, name, label, color }: { open: boolean; name?: string; label: string; color?: string }) {
  return (
    <span className={open ? "redact open" : "redact"} style={color ? tint(color) : undefined}>
      <span className="bar" aria-hidden="true" />
      <span className="name">{open ? name : ""}</span>
      {!open && <span className="sr">{label}</span>}
    </span>
  );
}

// Maps three graded calls to an alter ego. Illustrative logic for the concept demo.
function readPersona(results: Result[]): Reading {
  const right = results.filter((r) => r.grade > 0).length;
  const bold = results.filter((r, i) => SCENARIOS[i].opts[r.pick].bold).length;
  let key: PersonaKey;
  let why: string;
  if (right === 3) { key = "iceman"; why = "Three calls, three sharp reads. Nothing changed for you on the big points."; }
  else if (bold === 3) { key = "opener"; why = "You took the game on every single time."; }
  else if (bold === 2) { key = "closer"; why = "You want the ball when the game is late."; }
  else if (bold === 1) { key = "architect"; why = "You picked one moment to push and kept the shape everywhere else."; }
  else { key = "professor"; why = "You protected what you had and played the long game."; }
  let best = 0;
  results.forEach((r, i) => { if (r.grade > results[best].grade) best = i; });
  return {
    key, why,
    sharp: results[best].grade > 0 ? SCENARIOS[best].sport : "Still reading the game",
    style: bold >= 2 ? "Takes the game on" : "Protects the position",
  };
}

export default function Landing() {
  const [depth, setDepth] = useState<Depth>("fan");
  const [openReceipts, setOpenReceipts] = useState<Record<string, boolean>>({});
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState<(0 | 1 | null)[]>([null, null, null]);
  const [results, setResults] = useState<(Result | null)[]>([null, null, null]);
  const [rating, setRating] = useState(START_RATING);
  const [delta, setDelta] = useState(0);
  const [copyMsg, setCopyMsg] = useState("");
  const revealRef = useRef<HTMLHeadingElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pendingFocus = useRef(false);

  const graded = results.filter((r): r is Result => r !== null);
  const reading = graded.length === SCENARIOS.length ? readPersona(graded) : null;
  const persona = reading ? PERSONAS[reading.key] : null;
  const sc = SCENARIOS[idx];
  const result = results[idx];
  const pick = picks[idx];
  const best = sc.opts[0].p >= sc.opts[1].p ? 0 : 1;

  useEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    revealRef.current?.focus({ preventScroll: true });
    revealRef.current?.scrollIntoView({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
  }, [results]);

  function choose(k: 0 | 1) {
    if (result) return;
    setPicks((prev) => prev.map((v, i) => (i === idx ? k : v)));
  }

  function lock() {
    if (pick === null || result) return;
    const chosen = sc.opts[pick];
    const other = sc.opts[pick === 0 ? 1 : 0];
    const grade = chosen.p - other.p;
    const win = Math.random() * 100 < chosen.p;
    setResults((prev) => prev.map((v, i) => (i === idx ? { pick, grade, win } : v)));
    setRating((r) => r + grade * 2);
    setDelta(grade * 2);
    pendingFocus.current = true;
  }

  function goTo(n: number) {
    setIdx(n);
    tabRefs.current[n]?.focus();
  }

  function nextMoment() {
    const n = results.findIndex((r) => r === null);
    if (n === -1) {
      document.getElementById("file")?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth" });
      return;
    }
    goTo(n);
  }

  function onTabKey(e: KeyboardEvent<HTMLButtonElement>, k: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    goTo((k + (e.key === "ArrowRight" ? 1 : -1) + SCENARIOS.length) % SCENARIOS.length);
  }

  function reset() {
    setIdx(0);
    setPicks([null, null, null]);
    setResults([null, null, null]);
    setRating(START_RATING);
    setDelta(0);
    setCopyMsg("");
    tabRefs.current[0]?.focus();
  }

  async function copyLine() {
    if (!persona) return;
    const line = `My alter ego is ${persona.name}. Read rating ${rating}.`;
    try {
      await navigator.clipboard.writeText(line);
      setCopyMsg(`Copied: ${line}`);
    } catch {
      setCopyMsg(line);
    }
  }

  const brand = (
    <>
      <span className="mark" aria-hidden="true"><i /><i /><i /><i /><i /></span>
      <span className="wordmark">ALTER EGO</span>
    </>
  );

  return (
    <div className="ae">
      <a className="skip" href="#main">Skip to content</a>
      <header className="top">
        <div className="wrap top-inner">
          <Link className="brand" href="/" aria-label="ALTER EGO home">{brand}</Link>
          <nav className="nav" aria-label="Sections">
            <a href="#desk">The Desk</a><a href="#call">Make the call</a><a href="#roster">Roster</a><a href="#file">Your alter ego</a>
          </nav>
          <div className="top-actions">
            <Link className="btn btn-ghost btn-sm" href="/login">Sign in</Link>
            <a className="btn btn-primary btn-sm" href="#call">Make a call</a>
          </div>
        </div>
      </header>

      <main id="main">
        <section className="hero" aria-labelledby="hero-h">
          <div className="wrap">
            <h1 id="hero-h">Every legend has an alter ego. Earn yours.</h1>
            <div className="hero-row">
              <div>
                <p className="hero-lead">A sports desk and a game in one. Get one brief across cricket, football, basketball, tennis and F1, then make the calls that decide matches. Read the game well and you earn an alter ego of your own.</p>
                <div className="cta-row">
                  <a className="btn btn-primary" href="#call">Make your first call</a>
                  <a className="btn btn-ghost" href="#roster">Meet the roster</a>
                </div>
              </div>
              <div className="tease-box">
                <p className="tease">Your alter ego <Redact open={!!persona} name={persona?.name} color={persona?.color} label="is hidden until your first three calls" /></p>
                <p className="tease-note">{persona ? "Earned from three calls. Keep calling to sharpen it." : "Revealed after your first three calls."}</p>
              </div>
            </div>
            <ul className="wall" aria-label="The roster">
              {PERSONA_ORDER.map((key, i) => {
                const p = PERSONAS[key];
                return (
                  <li key={key} style={{ ...tint(p.color), ["--i" as string]: i } as CSSProperties}>
                    <a href={`#r-${key}`}>
                      <span className="band"><Pictogram sport={p.pictogram} /></span>
                      <span className="cap">{p.name}</span>
                      <span className="cap-sport">{p.sport}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="sec" id="desk" aria-labelledby="desk-h">
          <div className="wrap">
            <div className="sec-head">
              <h2 id="desk-h">The Desk</h2>
              <p className="lead">One brief for every sport you follow, ranked by how much each moment moved the game. Pick your depth, and tap a receipt to see where a number came from.</p>
            </div>
            <div className="panel desk">
              <div className="desk-bar">
                <p className="desk-title">Today’s brief <span className="tag">Illustrative</span></p>
                <div className="seg-wrap">
                  <span className="seg-label" id="depth-l">Depth</span>
                  <div className="seg" role="group" aria-labelledby="depth-l">
                    {(["new", "fan", "coach"] as Depth[]).map((d) => (
                      <button key={d} type="button" aria-pressed={depth === d} onClick={() => setDepth(d)}>
                        {d === "new" ? "New to it" : d === "fan" ? "Fan" : "Coach"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <p className="desk-note">Ranked by swing: the points of win chance each moment moved.</p>
              <ol className="brief">
                {BRIEF.map((item, i) => {
                  const open = !!openReceipts[item.id];
                  return (
                    <li className="item" key={item.id} style={tint(item.color)}>
                      <span className="rank" aria-hidden="true">{i + 1}</span>
                      <Pictogram sport={item.pictogram} className="pg" />
                      <div className="item-main">
                        <p className="item-sport">{item.sport}</p>
                        <p className="item-head">{item.head}</p>
                        <p className="item-depth">{item.depth[depth]}</p>
                        <button type="button" className="receipt" aria-expanded={open} aria-controls={item.id}
                          onClick={() => setOpenReceipts((s) => ({ ...s, [item.id]: !open }))}>
                          {item.receipt}
                        </button>
                        <div className="receipt-body" id={item.id} hidden={!open}><p>{item.receiptBody}</p></div>
                      </div>
                      <div className="item-swing">
                        <Spark points={item.points} />
                        <p className="swing"><span className="num">+{item.swing}</span><span className="unit">win-chance points</span></p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </section>

        <section className="sec" id="call" aria-labelledby="call-h">
          <div className="wrap">
            <div className="sec-head">
              <h2 id="call-h">Make the call</h2>
              <p className="lead">Pivotal moments, frozen before they play out. Make your call, lock it, then see how the numbers read it. You’re graded on the decision, not the result.</p>
            </div>
            <div className="panel call" style={tint(sc.color)}>
              <div className="tabs" role="tablist" aria-label="Choose a moment">
                {SCENARIOS.map((s, k) => (
                  <button key={s.sport} type="button" role="tab" className="tab" id={`tab-${k}`} aria-controls="sc"
                    aria-selected={k === idx} tabIndex={k === idx ? 0 : -1} style={tint(s.color)}
                    ref={(el) => { tabRefs.current[k] = el; }} onClick={() => setIdx(k)} onKeyDown={(e) => onTabKey(e, k)}>
                    <Pictogram sport={s.pictogram} /><span>{s.sport}</span><span className="done">{results[k] ? "Called" : ""}</span>
                  </button>
                ))}
              </div>
              <div className="call-grid">
                <div className="scenario" id="sc" role="tabpanel" aria-labelledby={`tab-${idx}`}>
                  <h3>{sc.title}</h3>
                  <p className="sc-text">{sc.text}</p>
                  <dl className="facts">
                    {sc.facts.map(([k, v]) => <div className="fact" key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
                  </dl>
                  <div className="opts" role="group" aria-label="Your options">
                    {sc.opts.map((o, k) => (
                      <button key={o.name} type="button" className="opt" aria-pressed={pick === k} disabled={!!result} onClick={() => choose(k as 0 | 1)}>
                        <strong>{o.name}</strong><span>{o.sub}</span>
                      </button>
                    ))}
                  </div>
                  {!result && (
                    <div className="lock-row">
                      <button type="button" className="btn btn-call" disabled={pick === null} onClick={lock}>Lock it in</button>
                      <p className="hint">{pick === null ? "Pick one, then lock it in." : "Locked calls can’t be changed."}</p>
                    </div>
                  )}
                  {result && (
                    <div className="reveal" aria-live="polite">
                      <div className="rev-grid">
                        <div>
                          <h4 className="rev-h" ref={revealRef} tabIndex={-1}>How the numbers read it</h4>
                          <div className="bars">
                            {sc.opts.map((o, k) => (
                              <div className="bar" key={o.name}>
                                <div className="bar-top">
                                  <span>{o.name}{k === best && <span className="fav">Favoured</span>}{k === result.pick && <span className="yours">Your call</span>}</span>
                                  <b>{o.p}%</b>
                                </div>
                                <div className="track"><div className={k === best ? "fill" : "fill dim"} style={{ width: `${o.p}%` }} /></div>
                              </div>
                            ))}
                          </div>
                          <p className="metric">{sc.metric}</p>
                          <p className="why">{sc.why}</p>
                        </div>
                        <div>
                          <h4 className="rev-h">Your grade</h4>
                          <p className={result.grade > 0 ? "grade plus" : "grade minus"}>{signed(result.grade)}</p>
                          <p className="grade-note">
                            {result.grade > 0
                              ? `Your call was worth ${result.grade} points of win chance more than the alternative when you made it.`
                              : `The alternative was worth ${Math.abs(result.grade)} points of win chance more when you made it.`}
                          </p>
                          <h4 className="rev-h">What happened, simulated</h4>
                          <p className="outcome">{result.win ? sc.win : sc.lose}</p>
                          <p className="crowd">{result.pick === 0 ? sc.crowd : 100 - sc.crowd}% of callers made the same call.</p>
                        </div>
                      </div>
                      <div className="rev-actions">
                        <button type="button" className="btn btn-primary" onClick={nextMoment}>
                          {results.some((r) => r === null) ? "Next moment" : "See your alter ego"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <aside className="scorecard" aria-label="Your read so far">
                  <p className="k">Read rating</p>
                  <p className="rating">
                    <span>{rating}</span>
                    <span className={delta > 0 ? "delta plus" : delta < 0 ? "delta minus" : "delta"}>{delta ? signed(delta) : ""}</span>
                  </p>
                  <p className="k">Calls made</p>
                  <p className="calls">{graded.length} of {SCENARIOS.length}</p>
                  <ul className="ledger" aria-label="Your calls">
                    {results.map((r, i) => r && (
                      <li key={SCENARIOS[i].sport}><span>{SCENARIOS[i].sport}</span><b className={r.grade > 0 ? "plus" : "minus"}>{signed(r.grade)}</b></li>
                    ))}
                  </ul>
                  <p className="note">Toy model and illustrative crowd numbers for this concept.</p>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>Start over</button>
                </aside>
              </div>
            </div>
          </div>
        </section>

        <section className="sec" id="roster" aria-labelledby="roster-h">
          <div className="wrap">
            <div className="sec-head">
              <h2 id="roster-h">The roster</h2>
              <p className="lead">Five specialist analysts, each built around one legend’s way of reading the game. They don’t pretend to be the legend. They think like the mentality that made the name.</p>
            </div>
            <div className="cards">
              {ROSTER.map((r) => {
                const p = PERSONAS[r.key];
                return (
                  <article className="card" id={`r-${r.key}`} key={r.key} style={tint(p.color)}>
                    <div className="card-band"><Pictogram sport={p.pictogram} /></div>
                    <div className="card-body">
                      <h3>{p.name}</h3>
                      <p className="card-sport">{p.sport}</p>
                      <dl>
                        <div><dt>Mentality</dt><dd>{r.mentality}</dd></div>
                        <div><dt>Signature tool</dt><dd>{r.tool}</dd></div>
                        <div className="lineage"><dt>Lineage</dt><dd>{r.lineage}</dd></div>
                      </dl>
                    </div>
                  </article>
                );
              })}
            </div>
            <p className="bench">Next on the bench: golf, American football, cycling and baseball.</p>
          </div>
        </section>

        <section className="sec" id="file" aria-labelledby="file-h">
          <div className="wrap file-grid">
            <div>
              <h2 className="h2" id="file-h">Your alter ego</h2>
              <p className="lead">Every call adds to your file: how you read the game, where you’re sharpest and which legend you play like. Earn the name, then share it with your league.</p>
            </div>
            <article className={persona ? "dossier revealed" : "dossier"} style={persona ? tint(persona.color) : undefined} aria-labelledby="dName" aria-live="polite">
              <p className="dossier-k">Alter ego file</p>
              <h3 className="dossier-name" id="dName">{persona ? persona.name : <Redact open={false} label="Not revealed yet" />}</h3>
              <dl>
                <div><dt>Read rating</dt><dd>{rating}</dd></div>
                <div><dt>Calls made</dt><dd>{graded.length} of {SCENARIOS.length}</dd></div>
                <div><dt>Sharpest in</dt><dd>{reading ? reading.sharp : "Not enough calls yet"}</dd></div>
                <div><dt>Style</dt><dd>{reading ? reading.style : "Not enough calls yet"}</dd></div>
              </dl>
              <p className="dossier-why">{reading ? reading.why : "Make three calls to reveal your name."}</p>
              <div className="dossier-actions">
                <a className="btn btn-ghost btn-sm" href="#call">Make a call</a>
                {persona && <button type="button" className="btn btn-primary btn-sm" onClick={copyLine}>Copy my line</button>}
              </div>
              <p className="copy-msg" aria-live="polite">{copyMsg}</p>
            </article>
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

        <section className="sec" aria-labelledby="start-h">
          <div className="wrap">
            <h2 className="h2" id="start-h">Where we start</h2>
            <ol className="steps">
              {STEPS.map((s, i) => (
                <li key={s.title} style={tint(s.color)}><span className="step-n">{i + 1}</span><h3>{s.title}</h3><p>{s.body}</p></li>
              ))}
            </ol>
            <a className="btn btn-primary" href="#call">Make your first call</a>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="wrap">
          <span className="brand">{brand}</span>
          <p>Working title. This page uses illustrative data and a toy model. The cricket leagues already in the app are free to play: <Link href="/dashboard">open your leagues</Link>.</p>
          <p>Athlete names and nicknames appear as editorial references to sporting history. No affiliation with or endorsement by any athlete, estate, team or league is implied.</p>
        </div>
      </footer>
    </div>
  );
}
