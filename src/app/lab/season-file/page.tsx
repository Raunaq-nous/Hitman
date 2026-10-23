import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUserId } from "@/providers/auth";
import { seasonFile } from "@/domain/lab/service";
import { DECISION_TYPE_LABEL, type NotebookCall } from "@/domain/lab/types";
import { ProvisionalBadge } from "@/ui";
import { LineOverCalls, ReliabilityDiagram } from "../notebook/charts";
import { PrintButton } from "./PrintButton";
import "../lab.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Season File" };

const pct = (x: number | null): string => (x === null ? "—" : `${Math.round(x * 100)}%`);
const pts = (p: number | null): string => (p === null ? "—" : `${p > 0 ? "+" : p < 0 ? "−" : ""}${Math.abs(p).toFixed(1)} pts`);

function Reads({ title, calls, testId }: { title: string; calls: NotebookCall[]; testId: string }): React.JSX.Element {
  return (
    <section aria-labelledby={`${testId}-h`} className="lab-col" data-testid={testId}>
      <h2 id={`${testId}-h`}>{title}</h2>
      {calls.length === 0 ? <p>None yet.</p> : (
        <ol className="lab-options">
          {/* the best option isn't named: a shared Season File must not give away golden-moment answers (D-045) */}
          {calls.map((c) => <li key={c.momentId}>{c.teams} ({c.season}), {DECISION_TYPE_LABEL[c.decisionType]}, {Math.round(c.confidence * 100)}% sure: {c.hit ? "the best call" : "not the best call"} — <strong>{pts(c.readPoints)}</strong></li>)}
        </ol>
      )}
    </section>
  );
}

export default async function SeasonFilePage(): Promise<React.JSX.Element> {
  const userId = await currentUserId();
  if (!userId) redirect(`/login?callbackUrl=${encodeURIComponent("/lab/season-file")}`);
  const f = await seasonFile(userId);
  return (
    <main className="crew-page lab-review season-file">
      <header>
        <p className="crew-kicker sf-noprint"><Link href="/lab">Decision Lab</Link> · Season File</p>
        <h1>Season File: {f.displayName}</h1>
        <p className="crew-lead">IPL golden moments · generated {f.generatedAt.slice(0, 10)}{f.alterEgo ? ` · ${f.alterEgo}` : ""}</p>
        <PrintButton />
      </header>
      <section className="lab-verdict" aria-label="Season summary" data-testid="summary">
        <p><strong>{f.calls}</strong> calls · <strong>{f.graded}</strong> graded · {f.coinFlips} coin flips (no grade)</p>
        <p>Best pick {pct(f.hitRate)} of the time · mean read {pts(f.meanRead)} · mean Brier {f.meanBrier === null ? "—" : f.meanBrier.toFixed(3)} · Read Rating <strong>{Math.round(f.rating.current)}</strong>{f.rating.provisional ? " (provisional)" : ""}</p>
        <ProvisionalBadge />
      </section>
      {f.warnings.length > 0 && <ul className="nb-warnings">{f.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
      <div className="lab-columns">
        <Reads title="Best reads" calls={f.best} testId="best-reads" />
        <Reads title="Worst reads" calls={f.worst} testId="worst-reads" />
      </div>
      <div className="lab-columns">
        <section aria-labelledby="sf-cal" className="lab-col"><h2 id="sf-cal">Calibration</h2><ReliabilityDiagram buckets={f.reliability} /></section>
        <section aria-labelledby="sf-rating" className="lab-col"><h2 id="sf-rating">Read Rating history</h2><LineOverCalls label="Read Rating history" points={f.rating.history.map((h) => ({ i: h.i, v: h.rating }))} format={(v) => String(Math.round(v))} testId="rating-line" fromZero={false} minSpan={60} /></section>
      </div>
      <p className="lab-note">Grades judge the decision against what was reasonable beforehand, not the result. Bragging rights only.</p>
    </main>
  );
}
