import { linePath, scale, swings, type WpPoint } from "./geometry";

export interface SeismographProps {
  title: string;
  points: WpPoint[];
  /** Scenario model estimate for the option not taken: drawn dashed, labelled as an estimate, never as fact. */
  ghost?: WpPoint[];
  /** Swings at or above this size get a marker (default 0.15 = 15 points). */
  swingThreshold?: number;
  /** Format the time axis value for the data table (e.g. legal balls → "17.4"). */
  formatT?: (t: number) => string;
  width?: number;
  height?: number;
}

const pct = (wp: number): string => `${Math.round(wp * 100)}%`;

/** Swing Seismograph: the win-probability trace with swing markers and an optional counterfactual ghost line. */
export function SwingSeismograph({ title, points, ghost, swingThreshold = 0.15, formatT = String, width = 640, height = 200 }: SeismographProps): React.JSX.Element {
  const box = { width, height, pad: 12 };
  const domain = ghost ? [...points, ...ghost] : points;
  const { x, y } = scale(domain.length ? domain : [{ t: 0, wp: 0.5 }], box);
  const big = swings(points, swingThreshold);
  const desc = points.length ? `Win probability from ${pct(points[0].wp)} to ${pct(points[points.length - 1].wp)}; ${big.length} swing${big.length === 1 ? "" : "s"} of ${Math.round(swingThreshold * 100)} points or more.` : "No data yet.";
  return (
    <figure className="ui-seis" style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}. ${desc}`} style={{ width: "100%", height: "auto", display: "block" }}>
        <rect x={0} y={0} width={width} height={height} rx={8} fill="var(--surface)" stroke="var(--line)" />
        <line x1={box.pad} x2={width - box.pad} y1={y(0.5)} y2={y(0.5)} stroke="var(--line)" strokeDasharray="4 4" />
        {ghost && ghost.length > 0 && <path d={linePath(ghost, box, domain)} fill="none" stroke="var(--receipt)" strokeWidth={2} strokeDasharray="6 5" data-testid="ghost" />}
        <path d={linePath(points, box, domain)} fill="none" stroke="var(--text)" strokeWidth={2.5} strokeLinejoin="round" />
        {big.map((s) => (
          <line key={`${s.from.t}-${s.to.t}`} x1={x(s.to.t)} x2={x(s.to.t)} y1={y(s.from.wp)} y2={y(s.to.wp)} stroke="var(--call)" strokeWidth={6} strokeLinecap="round" data-testid="swing" />
        ))}
      </svg>
      <figcaption style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "var(--step--1)", color: "var(--text-2)", marginTop: ".35rem" }}>
        <span>{title}</span>
        {ghost && <span>Dashed: scenario model estimate (not what happened)</span>}
      </figcaption>
      <details style={{ fontSize: "var(--step--1)" }}>
        <summary>Data table</summary>
        <table className="tabular">
          <thead><tr><th scope="col">Time</th><th scope="col">Win probability</th></tr></thead>
          <tbody>{points.map((p) => <tr key={p.t}><td>{formatT(p.t)}</td><td>{pct(p.wp)}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}
