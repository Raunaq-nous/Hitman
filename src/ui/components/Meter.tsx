/** Leverage Meter: a ten-segment meter for a 0–1 value, with an accessible meter role and a text value. */
export function Meter({ label, value, valueText }: { label: string; value: number; valueText: string }): React.JSX.Element {
  const v = Math.min(1, Math.max(0, value));
  const on = Math.round(v * 10);
  return (
    <div className="ui-meter" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} aria-valuetext={valueText}>
      <div className="ui-meter-head">
        <span>{label}</span>
        <span className="ui-meter-value tabular">{valueText}</span>
      </div>
      <div className="ui-meter-track" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => <span key={i} className="ui-meter-seg" data-on={i < on ? "" : undefined} />)}
      </div>
    </div>
  );
}
