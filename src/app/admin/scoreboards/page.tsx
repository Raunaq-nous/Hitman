import { notFound } from "next/navigation";
import { isAdminSession } from "@/providers/admin";
import { buildScoreboards } from "@/domain/scoreboards/service";
import type { Rate } from "@/domain/analytics/kpi";

export const metadata = { title: "Scoreboards", robots: { index: false } };
export const dynamic = "force-dynamic";

const pct = (r: Rate): string => (r.value === null ? "No data yet" : `${(r.value * 100).toFixed(1)}% (${r.numerator}/${r.denominator})`);

export default async function ScoreboardsPage(): Promise<React.JSX.Element> {
  if (!(await isAdminSession())) notFound();
  const s = await buildScoreboards();
  const w = s.product.week;
  return (
    <main className="crew-page" data-testid="scoreboards">
      <header>
        <h1>Scoreboards</h1>
        <p className="crew-lead">Admin only · generated <time dateTime={s.generatedAt}>{s.generatedAt.slice(0, 16).replace("T", " ")} UTC</time></p>
      </header>
      <section className="ui-card crew-members" aria-labelledby="trust-h">
        <h2 id="trust-h">Trust</h2>
        <dl className="roster-dl tabular">
          <dt>Freshness</dt><dd>{s.trust.freshness.length ? s.trust.freshness.map((f) => `${f.sourceId}: ${f.incidents} incidents, last ${f.lastObservedAt.slice(0, 16)}`).join(" · ") : "No ingested sources yet"}</dd>
          <dt>Corrections</dt><dd>{s.trust.corrections}</dd>
          <dt>Leakage tests</dt><dd>{s.trust.leakageTests}</dd>
          <dt>Verifier pass rate (7 days)</dt><dd>{s.trust.verifierPassRate.value === null ? "No model output checked yet" : `${(s.trust.verifierPassRate.value * 100).toFixed(1)}% (${s.trust.verifierPassRate.passed}/${s.trust.verifierPassRate.checked})`}</dd>
        </dl>
      </section>
      <section className="ui-card crew-members" aria-labelledby="product-h">
        <h2 id="product-h">Product · week of {w.weekStart.slice(0, 10)}</h2>
        <dl className="roster-dl tabular">
          <dt>Review-to-Next-Read (north star)</dt><dd>{pct(w.reviewToNextRead)}</dd>
          <dt>Active fans</dt><dd>{w.activeUsers}</dd>
          <dt>Graded calls per active fan</dt><dd>{w.gradedCallsPerActiveFan.value === null ? "No data yet" : w.gradedCallsPerActiveFan.value.toFixed(2)}</dd>
          <dt>Call participation</dt><dd>{pct(w.callParticipation)}</dd>
          <dt>New-fan first-call rate</dt><dd>{pct(w.newFanFirstCall)}</dd>
          <dt>D7 / D30 retention</dt><dd>{pct(w.d7Retention)} / {pct(w.d30Retention)}</dd>
          <dt>Share rate per reveal</dt><dd>{pct(w.shareRatePerReveal)}</dd>
          <dt>Receipt tap-through</dt><dd>{pct(w.receiptTapThrough)}</dd>
        </dl>
      </section>
      <section className="ui-card crew-members" aria-labelledby="learning-h">
        <h2 id="learning-h">Learning</h2>
        <dl className="roster-dl"><dt>Calibration buckets</dt><dd>{s.learning.calibration}</dd><dt>Comprehension</dt><dd>{s.learning.comprehension}</dd></dl>
      </section>
      <section className="ui-card crew-members" aria-labelledby="business-h">
        <h2 id="business-h">Business</h2>
        <dl className="roster-dl tabular">
          <dt>ARPU</dt><dd>{s.business.arpu}</dd>
          <dt>Data cost per user</dt><dd>{s.business.dataCostPerUser}</dd>
          <dt>Model cost per read (7 days)</dt><dd>{s.business.modelCostPerRead.usd === null ? `No priced model calls (${s.business.modelCostPerRead.reads} reads logged)` : `US$${s.business.modelCostPerRead.usd.toFixed(5)} over ${s.business.modelCostPerRead.pricedReads} priced reads`}</dd>
          <dt>Accounts</dt><dd>{s.business.users}</dd>
        </dl>
      </section>
    </main>
  );
}
