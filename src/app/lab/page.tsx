import Link from "next/link";
import { listMoments } from "@/domain/lab/service";
import "./lab.css";

export const metadata = { title: "The Decision Lab" };

const PHASE: Record<string, string> = { powerplay: "Powerplay", middle: "Middle overs", death: "Death overs" };

export default function LabPage(): React.JSX.Element {
  const moments = listMoments();
  return (
    <main className="crew-page">
      <header>
        <h1>The Decision Lab</h1>
        <p className="crew-lead">Real moments from IPL chases, stopped just before the decision. Make the call, say how sure you are, lock it — your read is graded on what was reasonable beforehand, not on how it turned out.</p>
        <p><Link href="/lab/notebook">Your Notebook and Read Rating</Link> · <Link href="/lab/alter-ego">Your Alter Ego</Link></p>
      </header>
      <ol className="lab-moments" data-testid="moments">
        {moments.map((m) => (
          <li key={m.id}>
            <Link className="ui-card lab-moment" href={`/lab/${m.id}`}>
              <span className="lab-moment-title">{m.battingTeam} need {m.runsRequired} off {m.ballsLeft}</span>
              <span className="lab-moment-meta">v {m.bowlingTeam} · IPL {m.season} · {PHASE[m.phase]} · {m.wicketsInHand} {m.wicketsInHand === 1 ? "wicket" : "wickets"} in hand</span>
            </Link>
          </li>
        ))}
      </ol>
      <p className="lab-note">Moments from Cricsheet ball-by-ball data (cricsheet.org), 2024–2026 seasons.</p>
    </main>
  );
}
