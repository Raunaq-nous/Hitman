import Link from "next/link";
import { notFound } from "next/navigation";
import { SPORTS, type SportSlug } from "@/domain/facts/types";
import { sportRooms } from "@/domain/rooms/service";
import { DataStateBadge } from "@/ui";
import "../rooms.css";

export const dynamicParams = false;
export function generateStaticParams(): { sport: string }[] {
  return SPORTS.map((sport) => ({ sport }));
}

const SPORT: Record<string, string> = { cricket: "Cricket", football: "Football", f1: "Formula 1", basketball: "Basketball", tennis: "Tennis" };

export async function generateMetadata({ params }: { params: Promise<{ sport: string }> }): Promise<{ title: string }> {
  return { title: `${SPORT[(await params).sport] ?? "Sport"} rooms` };
}

export default async function SportRoomsPage({ params }: { params: Promise<{ sport: string }> }): Promise<React.JSX.Element> {
  const { sport } = await params;
  if (!SPORTS.includes(sport as SportSlug)) notFound();
  const r = sportRooms(sport as SportSlug);
  return (
    <main className="crew-page">
      <header>
        <p className="crew-kicker"><Link href="/rooms">Event Rooms</Link></p>
        <h1>{SPORT[sport]}</h1>
      </header>
      {r.pending ? (
        <section className="ui-card room-panel" data-testid="pending">
          <DataStateBadge state="source-pending" label="Source pending" />
          <p>{r.pending}</p>
        </section>
      ) : (
        <ul className="crew-list" data-testid="rooms">
          {r.events.map((e) => (
            <li key={e.slug}>
              <Link className="ui-card crew-tile" href={`/rooms/${sport}/${e.slug}`}>
                <span className="crew-tile-name">{e.name}</span>
                <span className="crew-tile-meta">{e.competition} {e.season}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
