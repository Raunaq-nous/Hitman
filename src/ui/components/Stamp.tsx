export type StampKind = "locked" | "graded" | "classified" | "revealed" | "coin-flip";

const TEXT: Record<StampKind, string> = { locked: "Locked", graded: "Graded", classified: "Classified", revealed: "Revealed", "coin-flip": "Coin flip" };

export function Stamp({ kind, animate = false }: { kind: StampKind; animate?: boolean }): React.JSX.Element {
  return (
    <span className="ui-stamp" data-kind={kind} data-animate={animate ? "" : undefined} role="img" aria-label={TEXT[kind]}>
      {TEXT[kind]}
    </span>
  );
}
