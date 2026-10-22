import Link from "next/link";
import { SPORTS } from "@/domain/facts/types";
import { sportRooms } from "@/domain/rooms/service";
import { DataStateBadge } from "@/ui";
import "./rooms.css";

export const metadata = { title: "Event Rooms" };

const SPORT: Record<string, string> = { cricket: "Cricket", football: "Football", f1: "Formula 1", basketball: "Basketball", tennis: "Tennis" };

export default function RoomsPage(): React.JSX.Element {
  return (
    <main className="crew-page">
      <header>
        <h1>Event Rooms</h1>
        <p className="crew-lead">One room per recorded match, for five sports. Sports without a licensed source say so.</p>
      </header>
      <ul className="crew-list" data-testid="sports">
        {SPORTS.map((s) => {
          const r = sportRooms(s);
          return (
            <li key={s}>
              <Link className="ui-card crew-tile" href={`/rooms/${s}`}>
                <span className="crew-tile-name">{SPORT[s]}</span>
                <span className="crew-tile-meta">{r.events.length ? `${r.events.length} recorded ${r.events.length === 1 ? "event" : "events"}` : <DataStateBadge state="source-pending" label="Source pending" />}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
