import Link from "next/link";
import { notFound } from "next/navigation";
import type { SportSlug } from "@/domain/facts/types";
import { allRooms, eventRoom } from "@/domain/rooms/service";
import { DataStateBadge, Meter, ProvisionalBadge, Receipt, StreamDelayBadge, SwingSeismograph } from "@/ui";
import "../../rooms.css";

export const dynamicParams = false;
export function generateStaticParams(): { sport: string; event: string }[] {
  return allRooms().map((r) => ({ sport: r.sport, event: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ sport: string; event: string }> }): Promise<{ title: string }> {
  const { sport, event } = await params;
  return { title: eventRoom(sport as SportSlug, event)?.name ?? "Event Room" };
}

const SPORT: Record<string, string> = { cricket: "Cricket", football: "Football", f1: "Formula 1" };
const over = (t: number): string => `${Math.floor(t / 6)}.${t % 6}`;

export default async function EventRoomPage({ params }: { params: Promise<{ sport: string; event: string }> }): Promise<React.JSX.Element> {
  const { sport, event } = await params;
  const room = eventRoom(sport as SportSlug, event);
  if (!room) notFound();
  return (
    <main className="crew-page">
      <header>
        <p className="crew-kicker"><Link href={`/rooms/${sport}`}>{SPORT[sport]} rooms</Link></p>
        <h1>{room.name}</h1>
        <p className="crew-lead">{room.competition} {room.season}</p>
        <div className="room-badges">
          <DataStateBadge state="historical-replay" label="Historical replay" />
          <StreamDelayBadge live={false} recordedAt={room.observedFrom} />
          <Receipt receipt={room.receipt} attribution={room.attribution}>receipt</Receipt>
        </div>
      </header>
      <section className="ui-card room-panel" aria-labelledby="wp-h">
        <h2 id="wp-h">Win probability</h2>
        {room.wp ? (
          <>
            <SwingSeismograph title="Chasing side’s win probability, ball by ball" points={room.wp.points} formatT={over} />
            <p className="room-note"><ProvisionalBadge /> {room.wp.model} <Receipt receipt={room.receipt} attribution={room.attribution} details={[room.wp.model]}>receipt</Receipt></p>
          </>
        ) : <p className="room-note" data-testid="no-model">{room.noModel}</p>}
      </section>
      <section className="ui-card room-panel" aria-labelledby="lev-h">
        <h2 id="lev-h">Leverage</h2>
        {room.leverage ? (
          <>
            <Meter label="Peak leverage of the chase" value={room.leverage.value / 0.5} valueText={`${room.leverage.value.toFixed(2)} before ball ${room.leverage.at}`} />
            <p className="room-note"><ProvisionalBadge /> <Receipt receipt={room.receipt} attribution={room.attribution} details={[room.wp?.model ?? ""]}>receipt</Receipt></p>
          </>
        ) : <p className="room-note">Leverage needs a win-probability model; {room.noModel?.toLowerCase()}</p>}
        <p className="room-note">Leverage is the spread (standard deviation) of the next ball’s win probability; 0.5 is the most a probability can have.</p>
      </section>
      <section className="ui-card room-panel" aria-labelledby="stories-h">
        <h2 id="stories-h">Stories</h2>
        <ul className="room-stories" data-testid="stories">
          {room.stories.map((s) => <li key={`${s.kind}:${s.receipts[0]}`}>{s.title} <Receipt receipt={s.receipt} attribution={room.attribution}>receipt</Receipt></li>)}
        </ul>
      </section>
      <p className="room-note">{room.attribution}</p>
    </main>
  );
}
