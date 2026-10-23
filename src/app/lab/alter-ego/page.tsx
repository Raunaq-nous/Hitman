import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUserId } from "@/providers/auth";
import { alterEgoFor } from "@/domain/lab/service";
import { ProvisionalBadge, Stamp } from "@/ui";
import { DossierReveal, ShareAlterEgo } from "./Dossier";
import "../lab.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your Alter Ego" };

const pct = (x: number): string => `${Math.round(x * 100)}%`;

export default async function AlterEgoPage(): Promise<React.JSX.Element> {
  const userId = await currentUserId();
  if (!userId) redirect(`/login?callbackUrl=${encodeURIComponent("/lab/alter-ego")}`);
  const id = await alterEgoFor(userId);
  return (
    <main className="crew-page lab-review">
      <header>
        <p className="crew-kicker"><Link href="/lab">Decision Lab</Link> · Dossier</p>
        <h1>Your Alter Ego</h1>
        <p className="crew-lead">Built only from how you call: the risks you take, when you read the game best, how well your confidence matches your results, and how often you go against the crowd.</p>
      </header>
      {!id.revealed ? (
        <section className="dossier" data-testid="dossier">
          <div className="dossier-stamp"><Stamp kind="classified" /></div>
          <p>Your file opens after 10 graded calls. {id.graded} so far: <strong>{id.remaining} to go</strong>.</p>
          <p><Link className="lab-btn" href="/lab">Make a call</Link></p>
        </section>
      ) : (
        <DossierReveal persona={id.persona.slug} label={id.label}>
          <ul className="dossier-evidence">{id.evidence.map((e) => <li key={e}>{e}</li>)}</ul>
          <dl className="dossier-axes" data-testid="axes">
            {id.axes.map((a) => (
              <div key={a.key}>
                <dt>{a.label}{a.value === null ? "" : ` · ${pct(a.value)}`}</dt>
                <dd>{a.explanation}</dd>
              </div>
            ))}
          </dl>
          <p className="lab-note">From {id.graded} graded calls. Grades use the exact model: <ProvisionalBadge /></p>
          <p><ShareAlterEgo href={`/api/og/alter-ego/${userId}`} /></p>
        </DossierReveal>
      )}
    </main>
  );
}
