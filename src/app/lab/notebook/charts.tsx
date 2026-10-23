// Small SVG charts for the Notebook. Each is an image with a text description and a data table.
import type { Notebook } from "@/domain/lab/types";

const W = 320, H = 200, P = 28;
const pct = (x: number): string => `${Math.round(x * 100)}%`;

function Frame({ label, children, table }: { label: string; children: React.ReactNode; table: React.ReactNode }): React.JSX.Element {
  return (
    <figure className="nb-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        <rect x={0} y={0} width={W} height={H} rx={8} fill="var(--surface)" stroke="var(--line)" />
        {children}
      </svg>
      <details><summary>Data table</summary>{table}</details>
    </figure>
  );
}

/** Confidence (x) against how often calls at that confidence were right (y); the diagonal is perfect calibration. */
export function ReliabilityDiagram({ buckets }: { buckets: Notebook["reliability"] }): React.JSX.Element {
  const x = (c: number) => P + ((c - 0.5) / 0.5) * (W - 2 * P);
  const y = (r: number) => H - P - r * (H - 2 * P);
  const filled = buckets.filter((b) => b.n > 0);
  const desc = filled.length ? filled.map((b) => `${b.lo}–${b.hi}%: right ${pct(b.hitRate ?? 0)} of ${b.n}${b.small ? " (small sample)" : ""}`).join("; ") : "No graded calls yet.";
  return (
    <Frame label={`Reliability diagram. ${desc}`} table={
      <table className="tabular"><thead><tr><th scope="col">Confidence</th><th scope="col">Calls</th><th scope="col">Right</th></tr></thead>
        <tbody>{buckets.map((b) => <tr key={b.lo}><td>{b.lo}–{b.hi}%</td><td>{b.n}{b.small && b.n > 0 ? " (small sample)" : ""}</td><td>{b.hitRate === null ? "—" : pct(b.hitRate)}</td></tr>)}</tbody></table>
    }>
      <line x1={x(0.5)} y1={y(0.5)} x2={x(1)} y2={y(1)} stroke="var(--line)" strokeDasharray="4 4" />
      <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="var(--line)" />
      {filled.map((b) => (
        <circle key={b.lo} cx={x(b.meanConfidence ?? 0.5)} cy={y(b.hitRate ?? 0)} r={4 + Math.min(8, b.n)} fill={b.small ? "none" : "var(--text)"} stroke="var(--text)" strokeWidth={2} data-testid="reliability-point" />
      ))}
      <text x={P} y={H - 8} fontSize={10} fill="var(--text-2)">50%</text>
      <text x={W - P - 20} y={H - 8} fontSize={10} fill="var(--text-2)">100%</text>
    </Frame>
  );
}

/** A line chart of values over call number (Brier running mean, Read Rating). */
export function LineOverCalls({ label, points, format, testId, fromZero = true, minSpan = 0 }: { label: string; points: { i: number; v: number }[]; format: (v: number) => string; testId: string; fromZero?: boolean; minSpan?: number }): React.JSX.Element {
  const vs = points.map((p) => p.v);
  // ratings sit far from zero: scale to the data, at least `minSpan` wide, so changes are visible
  const mid = (Math.min(...vs) + Math.max(...vs)) / 2;
  const lo = fromZero ? Math.min(...vs, 0) : Math.min(...vs, mid - minSpan / 2), hi = fromZero ? Math.max(...vs, lo + 1e-9) : Math.max(...vs, mid + minSpan / 2);
  const n = Math.max(1, points.length - 1);
  const x = (k: number) => P + (k / n) * (W - 2 * P);
  const y = (v: number) => H - P - ((v - lo) / (hi - lo || 1)) * (H - 2 * P);
  const d = points.map((p, k) => `${k ? "L" : "M"}${x(k).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const desc = points.length ? `From ${format(points[0].v)} to ${format(points[points.length - 1].v)} over ${points.length} points.` : "No data yet.";
  return (
    <Frame label={`${label}. ${desc}`} table={
      <table className="tabular"><thead><tr><th scope="col">Call</th><th scope="col">Value</th></tr></thead>
        <tbody>{points.map((p) => <tr key={p.i}><td>{p.i}</td><td>{format(p.v)}</td></tr>)}</tbody></table>
    }>
      {points.length > 1 && <path d={d} fill="none" stroke="var(--text)" strokeWidth={2.5} data-testid={testId} />}
      {points.length === 1 && <circle cx={x(0)} cy={y(points[0].v)} r={4} fill="var(--text)" data-testid={testId} />}
    </Frame>
  );
}

/** Skill-domain radar: hit rate per domain on its own axis (unplayed domains sit at the centre). */
export function SkillRadar({ domains }: { domains: Notebook["domains"] }): React.JSX.Element {
  const cx = W / 2, cy = H / 2, r = H / 2 - P - 4;
  const at = (k: number, v: number) => {
    const a = -Math.PI / 2 + (2 * Math.PI * k) / domains.length;
    return [cx + Math.cos(a) * r * v, cy + Math.sin(a) * r * v] as const;
  };
  const poly = domains.map((d, k) => at(k, d.hitRate ?? 0).join(",")).join(" ");
  const desc = domains.map((d) => `${d.domain}: ${d.hitRate === null ? "no calls" : `right ${pct(d.hitRate)} of ${d.n}`}${d.small && d.n > 0 ? " (small sample)" : ""}`).join("; ");
  return (
    <Frame label={`Skill radar. ${desc}`} table={
      <table className="tabular"><thead><tr><th scope="col">Domain</th><th scope="col">Calls</th><th scope="col">Right</th><th scope="col">Mean read</th></tr></thead>
        <tbody>{domains.map((d) => <tr key={d.domain}><td>{d.domain}</td><td>{d.n}{d.small && d.n > 0 ? " (small sample)" : ""}</td><td>{d.hitRate === null ? "—" : pct(d.hitRate)}</td><td>{d.meanRead === null ? "—" : `${d.meanRead.toFixed(1)} pts`}</td></tr>)}</tbody></table>
    }>
      {domains.map((d, k) => { const [x2, y2] = at(k, 1); return <line key={d.domain} x1={cx} y1={cy} x2={x2} y2={y2} stroke="var(--line)" />; })}
      <polygon points={poly} fill="color-mix(in srgb, var(--text) 18%, transparent)" stroke="var(--text)" strokeWidth={2} data-testid="radar" />
      {domains.map((d, k) => {
        const [tx, ty] = at(k, 1.1);
        const anchor = Math.abs(tx - cx) < 1 ? "middle" : tx > cx ? "start" : "end";
        return <text key={d.domain} x={tx} y={ty + (ty > cy ? 10 : ty < cy - 1 ? -2 : 3)} fontSize={10} textAnchor={anchor} fill="var(--text-2)">{d.domain}</text>;
      })}
    </Frame>
  );
}
