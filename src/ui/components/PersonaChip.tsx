import { Pictogram } from "@/components/landing/Pictogram";
import { PERSONAS, type PersonaSlug } from "@/personas";

/** A persona's name with its colour and pictogram. Always labelled as an AI analyst. */
export function PersonaChip({ persona }: { persona: PersonaSlug }): React.JSX.Element {
  const p = PERSONAS[persona];
  return (
    <span className="ui-chip">
      <span className="ui-chip-mark" style={{ background: `var(${p.colorToken})` }} aria-hidden="true">
        <Pictogram sport={p.sportKey} />
      </span>
      {p.name}
      <span className="ui-chip-ai">AI analyst</span>
    </span>
  );
}
