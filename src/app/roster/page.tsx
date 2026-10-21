import Link from "next/link";
import { PersonaChip } from "@/ui";
import { PERSONAS, PERSONA_SLUGS } from "@/personas";
import { switchboard } from "@/domain/roster/service";
import { Switchboard } from "./Switchboard";

export const metadata = { title: "The roster" };

export default function RosterPage(): React.JSX.Element {
  const sb = switchboard();
  return (
    <main className="crew-page">
      <header>
        <h1>The roster</h1>
        <p className="crew-lead">Five original AI analysts, one per sport. They phrase verified facts in their own style; they never add facts and never imitate real athletes.</p>
      </header>
      <ul className="crew-list">
        {PERSONA_SLUGS.map((s) => (
          <li key={s}>
            <Link className="ui-card crew-tile" href={`/roster/${s}`}>
              <PersonaChip persona={s} />
              <span className="crew-tile-meta">{PERSONAS[s].sport} · {PERSONAS[s].skillDomain} · {PERSONAS[s].signatureTool}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Switchboard voicings={sb.voicings} label={sb.label} />
    </main>
  );
}
