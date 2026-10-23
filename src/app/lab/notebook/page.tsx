import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUserId } from "@/providers/auth";
import { notebook } from "@/domain/lab/service";
import { DECISION_TYPE_LABEL } from "@/domain/lab/types";
import { ProvisionalBadge } from "@/ui";
import { LineOverCalls, ReliabilityDiagram, SkillRadar } from "./charts";
import "../lab.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notebook" };

const pts = (p: number): string => `${p > 0 ? "+" : p < 0 ? "−" : ""}${Math.abs(p).toFixed(1)} pts`;

export default async function NotebookPage({ searchParams }: { searchParams: Promise<{ type?: string }> }): Promise<React.JSX.Element> {
  const userId = await currentUserId();
  if (!userId) redirect(`/login?callbackUrl=${encodeURIComponent("/lab/notebook")}`);
  const nb = await notebook(userId, { type: (await searchParams).type ?? null });
  return (
    <main className="crew-page lab-review">
      <header>
        <p className="crew-kicker"><Link href="/lab">Decision Lab</Link> · Notebook</p>
        <h1>Your Notebook</h1>
        <p className="crew-lead">Every call you’ve locked, how sure you were, and how good the read was.</p>
      </header>

      <section aria-labelledby="rating-h" className="lab-verdict" data-testid="rating">
        <h2 id="rating-h" className="nb-h">Read Rating</h2>
        <p className="nb-rating"><strong className="tabular">{Math.round(nb.rating.current)}</strong> after {nb.rating.graded} graded {nb.rating.graded === 1 ? "call" : "calls"}{nb.rating.provisional && <span className="nb-tag">Provisional rating</span>}</p>
        <ProvisionalBadge />
        <LineOverCalls label="Read Rating history" points={nb.rating.history.map((h) => ({ i: h.i, v: h.rating }))} format={(v) => String(Math.round(v))} testId="rating-line" fromZero={false} minSpan={60} />
      </section>

      {nb.warnings.length > 0 && <ul className="nb-warnings" data-testid="warnings">{nb.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}

      <nav aria-label="Filter calls" className="nb-filters">
        <span>Sport: Cricket</span>
        <Link href="/lab/notebook" aria-current={nb.filter.type === null ? "page" : undefined}>All decisions</Link>
        {nb.decisionTypes.map((t) => <Link key={t} href={`/lab/notebook?type=${t}`} aria-current={nb.filter.type === t ? "page" : undefined}>{DECISION_TYPE_LABEL[t]}</Link>)}
      </nav>

      <div className="lab-columns">
        <section aria-labelledby="rel-h" className="lab-col"><h2 id="rel-h">Reliability</h2><p className="lab-note">When you said 70% sure, were you right about 70% of the time? Hollow dots are small samples.</p><ReliabilityDiagram buckets={nb.reliability} /></section>
        <section aria-labelledby="brier-h" className="lab-col"><h2 id="brier-h">Brier over time</h2><p className="lab-note">Running mean; lower is better (0 is perfect).</p><LineOverCalls label="Brier score running mean" points={nb.brier.map((b) => ({ i: b.i, v: b.mean }))} format={(v) => v.toFixed(3)} testId="brier-line" /></section>
        <section aria-labelledby="radar-h" className="lab-col"><h2 id="radar-h">Skill domains</h2><p className="lab-note">How often your pick was the best option, by kind of decision and phase.</p><SkillRadar domains={nb.domains} /></section>
      </div>

      <section aria-labelledby="calls-h">
        <h2 id="calls-h" className="nb-h">Calls ({nb.calls.length})</h2>
        {nb.calls.length === 0
          ? <p>No calls yet. <Link href="/lab">Make your first call</Link>.</p>
          : (
            <table className="tabular nb-table" data-testid="call-history">
              <thead><tr><th scope="col">Moment</th><th scope="col">Decision</th><th scope="col">Your call</th><th scope="col">Best</th><th scope="col">Read</th><th scope="col">Brier</th></tr></thead>
              <tbody>
                {nb.calls.map((c) => (
                  <tr key={c.momentId}>
                    <td><Link href={`/lab/${c.momentId}/review`}>{c.teams} ({c.season})</Link></td>
                    <td>{DECISION_TYPE_LABEL[c.decisionType]}</td>
                    <td>{c.pick} · {Math.round(c.confidence * 100)}%</td>
                    <td>{c.best}</td>
                    <td>{c.graded ? pts(c.readPoints ?? 0) : "Coin flip — no grade"}</td>
                    <td>{c.brier === null ? "—" : c.brier.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        <ProvisionalBadge />
      </section>
    </main>
  );
}
