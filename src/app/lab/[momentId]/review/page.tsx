import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUserId } from "@/providers/auth";
import { isDomainError } from "@/domain/shared/types";
import { nextMomentFor, reviewCall } from "@/domain/lab/service";
import { track } from "@/domain/analytics/service";
import { NextReadLink } from "../../_components/LabEvents";
import type { CallReview } from "@/domain/lab/types";
import { ProvisionalBadge, Receipt, SwingSeismograph } from "@/ui";
import "../../lab.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your review" };

const pct = (wp: number): string => `${(wp * 100).toFixed(1)}%`;
const pts = (p: number): string => `${p > 0 ? "+" : p < 0 ? "−" : ""}${Math.abs(p).toFixed(1)} pts`;
const cap = (s: string): string => s[0].toUpperCase() + s.slice(1);
const oversOf = (legal: number): string => `${Math.floor(legal / 6)}.${legal % 6}`;

/** One sentence the fan can take to the next read (template-based; no language model). */
function lesson(r: CallReview): string {
  const best = r.options.find((o) => o.option === r.grade.best);
  const second = [...r.options].filter((o) => o.option !== r.grade.best).sort((a, b) => b.wp - a.wp)[0];
  if (!best || !second) return "";
  if (!r.grade.graded) return `Here the options were within 2 points of each other: a coin flip, so no grade.`;
  const lead = `Needing ${r.moment.runsRequired} off ${r.moment.ballsLeft} with ${r.moment.wicketsInHand} wickets in hand, “${best.label}” was worth ${((best.wp - second.wp) * 100).toFixed(1)} points more than “${second.label}”.`;
  return r.grade.hit ? `${lead} You read it.` : `${lead} Look for this shape next time.`;
}

export default async function ReviewPage({ params }: { params: Promise<{ momentId: string }> }): Promise<React.JSX.Element> {
  const { momentId } = await params;
  const userId = await currentUserId();
  if (!userId) redirect(`/login?callbackUrl=${encodeURIComponent(`/lab/${momentId}/review`)}`);
  let r: CallReview;
  try {
    r = await reviewCall(userId, momentId);
  } catch (e) {
    if (isDomainError(e) && e.code === "NOT_FOUND") {
      return (
        <main className="crew-page">
          <h1>No call yet</h1>
          <p className="crew-lead">Lock a call on this moment to see your review.</p>
          <p><Link className="lab-btn" href={`/lab/${momentId}`}>Make the call</Link></p>
        </main>
      );
    }
    throw e;
  }
  const next = await nextMomentFor(userId, momentId);
  await track("review_viewed", { callId: r.callId }, userId);
  const m = r.moment;
  const t0 = 120 - m.ballsLeft;
  const pick = r.options.find((o) => o.option === r.call.option);
  const fact = { sourceId: "cricsheet", sourceClass: "VERIFIED_DELAYED" as const, observedAt: `${r.matchDate}T00:00:00.000Z`, clock: "replay" as const };
  const modelDetails = [`Model estimate: exact chase win probability from outcomes-v1 (${r.receipts.outcomesHash.slice(0, 12)}) and option counts options-v1 (${r.receipts.optionsHash.slice(0, 12)})`, `Moment fixture ${r.receipts.momentsHash.slice(0, 12)}`, "Provisional calibration"];
  const w = r.after.window;
  return (
    <main className="crew-page lab-review">
      <header>
        <p className="crew-kicker"><Link href="/lab">Decision Lab</Link> · Review</p>
        <h1>{m.battingTeam} v {m.bowlingTeam}</h1>
        <p className="crew-lead">IPL {m.season} · needing {m.runsRequired} off {m.ballsLeft} · {m.question}</p>
      </header>

      <section className="lab-verdict" aria-label="Your grade" data-testid="grade">
        <p className="lab-verdict-pick">You called <strong>{cap(pick?.label ?? r.call.option)}</strong> at {Math.round(r.call.confidence * 100)}% sure.</p>
        {r.grade.graded
          ? <p className="lab-verdict-points">Read: <strong>{pts(r.grade.readPoints ?? 0)}</strong> · Read Rating {Math.round(r.rating.before)} → <strong>{Math.round(r.rating.after)}</strong> · Calibration (Brier) {r.grade.brier?.toFixed(3)}</p>
          : <p className="lab-verdict-points"><strong>Coin flip — no grade</strong></p>}
        <ProvisionalBadge />
      </section>

      <div className="lab-columns" data-testid="review-columns">
        <section aria-labelledby="col-happened" className="lab-col">
          <h2 id="col-happened">What happened</h2>
          <p>Over the next {w.legalBalls} legal {w.legalBalls === 1 ? "ball" : "balls"} the chasing side scored <strong>{w.runs}</strong> for <strong>{w.wickets}</strong> {w.wickets === 1 ? "wicket" : "wickets"}.</p>
          <p>{r.reveal.chaseWon ? `${m.battingTeam} won the chase.` : `${r.reveal.winner} defended the total.`}</p>
          <Receipt receipt={fact} attribution="Data from Cricsheet (cricsheet.org)" details={["Observed, from ball-by-ball data"]} />
        </section>
        <section aria-labelledby="col-reasonable" className="lab-col">
          <h2 id="col-reasonable">What was reasonable beforehand</h2>
          <p>Win probability at the moment: <strong>{pct(r.after.wpAtMoment)}</strong>. Model estimate for each option, using only data from before the moment:</p>
          <ul className="lab-options">
            {[...r.options].sort((a, b) => b.wp - a.wp).map((o) => (
              <li key={o.option}>{cap(o.label)}: <strong>{pct(o.wp)}</strong>{o.option === r.grade.best ? " · best" : ""}{o.option === r.call.option ? " · your call" : ""}</li>
            ))}
          </ul>
          <ProvisionalBadge />
          <Receipt receipt={fact} details={modelDetails}>model receipt</Receipt>
        </section>
        <section aria-labelledby="col-otherwise" className="lab-col">
          <h2 id="col-otherwise">What might have happened otherwise</h2>
          <p>Scenario model estimate if they had chosen “{r.scenario.label}”: <strong>{pct(r.scenario.wp)}</strong> to win. This is an estimate, not what would have happened.</p>
          <ProvisionalBadge />
          <Receipt receipt={fact} details={[...modelDetails, "Scenario model estimate (counterfactual), never shown as fact"]}>scenario receipt</Receipt>
        </section>
      </div>

      <SwingSeismograph
        title="Win probability from the moment to the end of the chase (model estimate on what happened)"
        points={r.after.wpPath}
        ghost={[{ t: t0, wp: r.after.wpAtMoment }, { t: t0 + w.plannedBalls, wp: r.scenario.wp }]}
        formatT={oversOf}
      />

      <p className="lab-lesson" data-testid="lesson">{lesson(r)}</p>
      <p className="nb-filters"><NextReadLink fromCallId={r.callId} momentId={next} /> {r.grade.graded && <a href={`/api/og/call/${r.callId}`} target="_blank" rel="noopener" data-testid="share-card">Share card (image)</a>}</p>
    </main>
  );
}
