import Link from "next/link";
import { pageUserId, orNotFound } from "@/providers/page";
import { getCrewForMember } from "@/domain/crews/service";
import { crewTower } from "@/domain/lab/service";
import { ProvisionalBadge, TimingTowerRow } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Crew timing tower" };

export default async function CrewTowerPage({ params }: { params: Promise<{ crewId: string }> }): Promise<React.JSX.Element> {
  const { crewId } = await params;
  const userId = await pageUserId();
  const crew = await orNotFound(getCrewForMember(userId, crewId));
  const rows = await crewTower(crew.members.map((m) => ({ id: m.user.id, name: m.user.name })));
  return (
    <main className="crew-page">
      <header>
        <p className="crew-kicker"><Link href={`/crews/${crew.id}`}>{crew.name}</Link></p>
        <h1>Timing tower</h1>
        <p className="crew-lead">Read Rating from Decision Lab calls: rank, calibration (Brier, lower is better), calls this week, form over the last five calls and places gained or lost since Monday. Bragging rights only.</p>
        <ProvisionalBadge />
      </header>
      <ol className="ui-tower" data-testid="tower" aria-label="Crew timing tower">
        {rows.map((r) => <TimingTowerRow key={r.id} entry={{ rank: r.rank, name: r.id === userId ? `${r.name} (you)` : r.name, readRating: r.readRating, brier: r.brier, callsThisWeek: r.callsThisWeek, form: r.form, change: r.change }} />)}
      </ol>
      <p className="crew-lead">Form: + best pick, − not the best, · coin flip (no grade). <Link href="/lab">Make a call</Link></p>
    </main>
  );
}
