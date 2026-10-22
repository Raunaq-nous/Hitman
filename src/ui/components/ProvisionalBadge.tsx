/**
 * "Provisional calibration" (D-031): shown on every win probability and grade while the calibration gate (F-E-04)
 * is a known issue. The exact model's probabilities are shown as they are, not recalibrated.
 */
export function ProvisionalBadge({ label = "Provisional calibration" }: { label?: string }): React.JSX.Element {
  return <span className="ui-badge ui-provisional" data-state="projection" data-testid="provisional">{label}</span>;
}
