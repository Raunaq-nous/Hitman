"use client";

import { useState } from "react";
import type { Voicing } from "@/domain/roster/service";

/** Pick an analyst; the same verified facts are re-voiced. Every voice is labelled as an AI analyst. */
export function Switchboard({ voicings, label }: { voicings: Voicing[]; label: string }): React.JSX.Element {
  const [active, setActive] = useState(voicings[0].persona);
  const v = voicings.find((x) => x.persona === active) ?? voicings[0];
  return (
    <section className="ui-card roster-switch" aria-labelledby="switch-h" data-testid="switchboard">
      <h2 id="switch-h">Persona Switchboard</h2>
      <p className="roster-note">{label}</p>
      <fieldset className="roster-pick">
        <legend className="sr-only">Choose an analyst</legend>
        {voicings.map((x) => (
          <label key={x.persona} className="roster-pick-opt" style={{ ["--c" as string]: `var(--${x.persona})` }}>
            <input type="radio" name="persona" value={x.persona} checked={active === x.persona} onChange={() => setActive(x.persona)} />
            {x.name}
          </label>
        ))}
      </fieldset>
      <blockquote className="roster-voice" aria-live="polite" data-testid="voicing">
        <p className="roster-who">{v.name} <span className="ui-chip-ai">AI analyst</span></p>
        {v.sentences.map((s) => <p key={s}>{s}</p>)}
        <p className="ui-receipt">src engine:tennis-iid · model estimate on the example state</p>
      </blockquote>
    </section>
  );
}
