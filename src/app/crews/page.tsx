import Link from "next/link";
import { pageUserId } from "@/providers/page";
import { listMyCrews } from "@/domain/crews/service";
import { CrewForms } from "./CrewForms";

export const metadata = { title: "Your crews" };

export default async function CrewsPage(): Promise<React.JSX.Element> {
  const userId = await pageUserId();
  const crews = await listMyCrews(userId);
  return (
    <main className="crew-page">
      <header>
        <h1>Your crews</h1>
        <p className="crew-lead">Private groups of friends who make calls on the same moments. Crews are invite-only.</p>
      </header>
      {crews.length === 0 ? (
        <p className="ui-card crew-empty">You’re not in a crew yet. Start one, or join with a code from a friend.</p>
      ) : (
        <ul className="crew-list">
          {crews.map((c) => (
            <li key={c.id}>
              <Link className="ui-card crew-tile" href={`/crews/${c.id}`}>
                <span className="crew-tile-name">{c.name}</span>
                <span className="crew-tile-meta tabular">{c.memberCount} {c.memberCount === 1 ? "member" : "members"}{c.isOwner ? " · you own this crew" : ""}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <CrewForms />
    </main>
  );
}
