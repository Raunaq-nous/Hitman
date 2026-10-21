import { notFound } from "next/navigation";
import Link from "next/link";
import { PersonaChip } from "@/ui";
import { isPersonaSlug, PERSONAS } from "@/personas";
import { switchboard } from "@/domain/roster/service";

export default async function PersonaPage({ params }: { params: Promise<{ persona: string }> }): Promise<React.JSX.Element> {
  const { persona } = await params;
  if (!isPersonaSlug(persona)) notFound();
  const p = PERSONAS[persona];
  const sb = switchboard();
  const voice = sb.voicings.find((v) => v.persona === persona);
  return (
    <main className="crew-page">
      <header>
        <p className="crew-kicker"><Link href="/roster">The roster</Link></p>
        <h1>{p.name}</h1>
        <p><PersonaChip persona={persona} /></p>
      </header>
      <section className="ui-card crew-members" aria-labelledby="card-h">
        <h2 id="card-h">Card</h2>
        <dl className="roster-dl">
          <dt>Sport</dt><dd>{p.sport}</dd>
          <dt>Skill domain</dt><dd>{p.skillDomain}</dd>
          <dt>Signature tool</dt><dd>{p.signatureTool}</dd>
          <dt>Skill words</dt><dd>{p.skillWords.join(", ")}</dd>
        </dl>
      </section>
      {voice && (
        <section className="ui-card crew-members" aria-labelledby="voice-h">
          <h2 id="voice-h">How {p.name} reads the example</h2>
          <p className="roster-note">{sb.label}</p>
          <p className="roster-who">{p.name} <span className="ui-chip-ai">AI analyst</span></p>
          {voice.sentences.map((s) => <p key={s}>{s}</p>)}
        </section>
      )}
    </main>
  );
}

export function generateMetadata(): { title: string } {
  return { title: "Analyst" };
}
