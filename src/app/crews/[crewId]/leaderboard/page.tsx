import Link from "next/link";
import { pageUserId, orNotFound } from "@/providers/page";
import { getCrewForMember } from "@/domain/crews/service";
import { crewStandings } from "@/domain/contests/service";

export const metadata = { title: "Crew standings" };

export default async function CrewStandingsPage({ params }: { params: Promise<{ crewId: string }> }): Promise<React.JSX.Element> {
  const { crewId } = await params;
  const userId = await pageUserId();
  const crew = await orNotFound(getCrewForMember(userId, crewId));
  const standings = await crewStandings(userId, crewId);
  return (
    <main className="crew-page">
      <header>
        <p className="crew-kicker"><Link href={`/crews/${crew.id}`}>{crew.name}</Link></p>
        <h1>Crew standings</h1>
        <p className="crew-lead">Points from completed, scored matches. Points are bragging rights only.</p>
      </header>
      <section className="ui-card crew-members" aria-labelledby="standings-h">
        <h2 id="standings-h" className="sr-only">Standings</h2>
        <ol className="crew-standings">
          {standings.map((s, i) => (
            <li key={s.user.id}>
              <span className="tabular crew-rank">{i + 1}</span>
              <span className="crew-member-name">{s.user.name}{s.user.id === userId ? " (you)" : ""}</span>
              <span className="tabular">{s.points.toFixed(1)} pts</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
