import Link from "next/link";
import { pageUserId, orNotFound } from "@/providers/page";
import { getCrewForMember } from "@/domain/crews/service";
import { openMatchesForCrew } from "@/domain/contests/service";
import { listReports } from "@/domain/moderation/service";
import { InvitePanel, LeaveButton, MemberMenu, RemoveMemberButton, ResolveReportButton } from "./CrewAdmin";

export const metadata = { title: "Crew" };

export default async function CrewPage({ params }: { params: Promise<{ crewId: string }> }): Promise<React.JSX.Element> {
  const { crewId } = await params;
  const userId = await pageUserId();
  const crew = await orNotFound(getCrewForMember(userId, crewId));
  const matches = await openMatchesForCrew(userId, crewId);
  const reports = crew.isOwner ? await listReports(userId, crewId) : [];
  return (
    <main className="crew-page">
      <header>
        <p className="crew-kicker"><Link href="/crews">Your crews</Link></p>
        <h1>{crew.name}</h1>
        <p className="crew-lead tabular">{crew.members.length} {crew.members.length === 1 ? "member" : "members"} · private</p>
      </header>
      <InvitePanel crewId={crew.id} inviteCode={crew.inviteCode} isOwner={crew.isOwner} />
      <section className="ui-card crew-members" aria-labelledby="members-h">
        <h2 id="members-h">Members</h2>
        <ul data-testid="members">
          {crew.members.map((m) => (
            <li key={m.user.id}>
              <span className="crew-member-name">{m.user.name}{m.user.id === userId ? " (you)" : ""}</span>
              {m.isOwner && <span className="ui-badge" data-state="delayed">Owner</span>}
              {crew.isOwner && !m.isOwner && <RemoveMemberButton crewId={crew.id} userId={m.user.id} name={m.user.name} />}
              {m.user.id !== userId && <MemberMenu crewId={crew.id} userId={m.user.id} name={m.user.name} canHandOver={crew.isOwner} />}
            </li>
          ))}
        </ul>
      </section>
      {crew.isOwner && reports.length > 0 && (
        <section className="ui-card crew-members" aria-labelledby="reports-h" data-testid="reports">
          <h2 id="reports-h">Reports</h2>
          <ul>
            {reports.map((r) => (
              <li key={r.id}><span className="crew-member-name">{r.reporterName} reported {r.reportedName}: {r.reason}{r.note ? ` — ${r.note}` : ""}</span><ResolveReportButton crewId={crew.id} reportId={r.id} /></li>
            ))}
          </ul>
        </section>
      )}
      <section className="ui-card crew-matches" aria-labelledby="matches-h">
        <h2 id="matches-h">Matches</h2>
        {matches.length === 0 ? (
          <p className="crew-lead">No upcoming matches yet.</p>
        ) : (
          <ul>
            {matches.map((m) => (
              <li key={m.id}>
                <Link href={`/crews/${crew.id}/match/${m.id}`}>{m.team1} v {m.team2}</Link>
                <time className="tabular" dateTime={m.date}>{new Date(m.date).toUTCString().slice(0, 22)} UTC</time>
              </li>
            ))}
          </ul>
        )}
        <p><Link href={`/crews/${crew.id}/leaderboard`}>Crew standings</Link></p>
      </section>
      <LeaveButton crewId={crew.id} />
    </main>
  );
}
