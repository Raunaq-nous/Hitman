import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUserId } from "@/providers/auth";
import { alterEgoFor, alterEgoShareToken } from "@/domain/lab/service";
import { trackOnce } from "@/domain/analytics/service";
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
  const token = id.revealed ? await alterEgoShareToken(userId) : null;
  if (id.revealed) await trackOnce("alter_ego_revealed", { persona: id.persona.slug }, userId);
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
        <DossierReveal label={id.label}>
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
          <p className="lab-note">Your file is private. Sharing creates a link to a card with your display name and Alter Ego only; you can stop sharing at any time.</p>
          <ShareAlterEgo initialUrl={token ? `/api/og/alter-ego/${token}` : null} />
        </DossierReveal>
      )}
    </main>
  );
}
