import type { DataState } from "@/domain/sources/types";

/** Every data panel says what kind of data it shows: live, delayed, historical replay, stale · 3 min, source pending… */
export function DataStateBadge({ state, label }: { state: DataState; label: string }): React.JSX.Element {
  return (
    <span className="ui-badge" data-state={state} role="status" aria-label={`Data: ${label}`}>
      {label}
    </span>
  );
}
