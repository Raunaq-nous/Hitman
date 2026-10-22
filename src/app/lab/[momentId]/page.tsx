import Link from "next/link";
import { notFound } from "next/navigation";
import { getMoment, listMoments } from "@/domain/lab/service";
import { CallTicket } from "./CallTicket";
import "../lab.css";

export const dynamicParams = false;
export function generateStaticParams(): { momentId: string }[] {
  return listMoments().map((m) => ({ momentId: m.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ momentId: string }> }): Promise<{ title: string }> {
  const m = getMoment((await params).momentId);
  return { title: m ? `${m.battingTeam} need ${m.runsRequired} off ${m.ballsLeft}` : "Decision Lab" };
}

export default async function MomentPage({ params }: { params: Promise<{ momentId: string }> }): Promise<React.JSX.Element> {
  const m = getMoment((await params).momentId);
  if (!m) notFound();
  return (
    <main className="crew-page">
      <header>
        <p className="crew-kicker"><Link href="/lab">Decision Lab</Link></p>
        <h1>{m.battingTeam} v {m.bowlingTeam}</h1>
        <p className="crew-lead">IPL {m.season} · {m.venue} · chasing {m.target}</p>
      </header>
      <CallTicket moment={m} />
    </main>
  );
}
