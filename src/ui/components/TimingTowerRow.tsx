export type FormResult = "good" | "poor" | "none";

export interface TimingTowerEntry {
  rank: number;
  name: string;
  readRating: number;
  brier: number | null;
  callsThisWeek: number;
  form: FormResult[];
  change: number;
}

const FORM_TEXT: Record<FormResult, string> = { good: "+", poor: "−", none: "·" };

/** One dense F1-style leaderboard row: rank, name, Read Rating, calibration, calls, form, position change. */
export function TimingTowerRow({ entry }: { entry: TimingTowerEntry }): React.JSX.Element {
  const dir = entry.change > 0 ? "up" : entry.change < 0 ? "down" : "same";
  return (
    <li className="ui-tower-row">
      <span className="ui-tower-rank tabular" aria-label={`Rank ${entry.rank}`}>{entry.rank}</span>
      <span>
        <span className="ui-tower-name">{entry.name}</span>
        <span className="ui-tower-meta tabular"> · {entry.callsThisWeek} calls this week</span>
      </span>
      <span className="ui-tower-meta tabular" aria-label={entry.brier === null ? "Calibration: not enough calls" : `Brier score ${entry.brier.toFixed(3)}`}>
        {entry.brier === null ? "Brier –" : `Brier ${entry.brier.toFixed(3)}`}
      </span>
      <span className="ui-form" role="img" aria-label={`Form, last ${entry.form.length}: ${entry.form.join(", ")}`}>
        {entry.form.map((r, i) => <span key={i} data-r={r} aria-hidden="true">{FORM_TEXT[r]}</span>)}
      </span>
      <span>
        <span className="ui-tower-rating tabular" aria-label={`Read Rating ${entry.readRating}`}>{entry.readRating}</span>{" "}
        <span className="ui-tower-change tabular" data-dir={dir} aria-label={dir === "same" ? "No change" : `${dir} ${Math.abs(entry.change)}`}>
          {dir === "up" ? `▲${entry.change}` : dir === "down" ? `▼${Math.abs(entry.change)}` : "–"}
        </span>
      </span>
    </li>
  );
}
