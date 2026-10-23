import { notFound } from "next/navigation";
import Link from "next/link";
import { PersonaChip } from "@/ui";
import { isPersonaSlug, PERSONAS } from "@/personas";
import { personaTool, switchboard } from "@/domain/roster/service";
import { Receipt } from "@/ui";

export default async function PersonaPage({ params }: { params: Promise<{ persona: string }> }): Promise<React.JSX.Element> {
  const { persona } = await params;
  if (!isPersonaSlug(persona)) notFound();
  const p = PERSONAS[persona];
  const sb = switchboard();
  const voice = sb.voicings.find((v) => v.persona === persona);
  const tool = personaTool(persona);
  const KIND = { live: "Live in the Lab", "open-data": "Demo on open data", illustrative: "Illustrative data, not a real match", pending: "Source pending" } as const;
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
      <section className="ui-card crew-members" aria-labelledby="tool-h" data-testid="persona-tool" data-kind={tool.kind}>
        <h2 id="tool-h">Signature tool: {tool.title}</h2>
        <p className="roster-note" data-testid="tool-kind">{KIND[tool.kind]}</p>
        <p>{tool.note}</p>
        {tool.kind === "live" && <ul>{tool.links.map((l) => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}</ul>}
        {(tool.kind === "open-data" || tool.kind === "illustrative") && (
          <table className="tabular roster-tool">
            <tbody>{tool.rows.map((r) => <tr key={r.label}><th scope="row">{r.label}</th><td>{r.value}</td></tr>)}</tbody>
          </table>
        )}
        {tool.kind === "open-data" && <Receipt receipt={tool.receipt} attribution={tool.attribution} />}
      </section>
      {voice && (
        <section className="ui-card crew-members" aria-labelledby="voice-h" data-persona-voice={persona}>
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
