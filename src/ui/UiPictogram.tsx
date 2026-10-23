import type { ReactNode } from "react";

// Key UI pictograms on the same 48-unit grid and 4.2 stroke as the sport pictograms (Munich '72 spirit, original).
const line = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 4.2 } as const;

export type UiPictogramKey = "decide" | "lock" | "grade" | "receipt" | "crew" | "language";

const SHAPES: Record<UiPictogramKey, ReactNode> = {
  // a fork in the path: the decision
  decide: <g {...line}><path d="M24 44V26" /><path d="M24 26 12 12" /><path d="M24 26 36 12" /><path d="M8 14h8v-8" /><path d="M40 14h-8v-8" /></g>,
  // padlock: the call is locked before the outcome
  lock: <><g {...line}><rect x="10" y="22" width="28" height="20" rx="3" /><path d="M16 22v-6a8 8 0 0 1 16 0v6" /></g><circle cx="24" cy="32" r="3" fill="currentColor" /></>,
  // target: graded on the read, not the result
  grade: <><g {...line}><circle cx="24" cy="24" r="17" /><circle cx="24" cy="24" r="9" /></g><circle cx="24" cy="24" r="3" fill="currentColor" /></>,
  // receipt with a torn edge
  receipt: <g {...line}><path d="M12 6h24v36l-4-3-4 3-4-3-4 3-4-3-4 3z" /><path d="M18 16h12" /><path d="M18 24h12" /><path d="M18 32h7" /></g>,
  // three heads: a crew
  crew: <><g {...line}><path d="M8 42v-6a8 8 0 0 1 16 0v6" /><path d="M24 42v-6a8 8 0 0 1 16 0v6" /></g><circle cx="16" cy="18" r="5" fill="currentColor" /><circle cx="32" cy="18" r="5" fill="currentColor" /></>,
  // two speech panels: language
  language: <g {...line}><path d="M6 8h22v14H16l-6 5v-5H6z" /><path d="M42 22v14h-4v5l-6-5H20V28" /></g>,
};

export function UiPictogram({ name, className }: { name: UiPictogramKey; className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true" focusable="false" data-pictogram={name}>
      {SHAPES[name]}
    </svg>
  );
}
