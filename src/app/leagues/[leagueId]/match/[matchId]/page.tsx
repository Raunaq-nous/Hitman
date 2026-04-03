import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import TeamBuilderClient from "@/components/TeamBuilderClient";
import TreasurerCard from "@/components/TreasurerCard";
import LiveMatchCenter from "@/components/LiveMatchCenter";
import MatchContestTabs from "@/components/MatchContestTabs";

export default async function MatchContestPage({
  params
}: {
  params: Promise<{ leagueId: string; matchId: string }>
}) {
  const { leagueId, matchId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const match = await prisma.match.findUnique({
    where: { id: matchId }
  });

  if (!match) redirect(`/leagues/${leagueId}`);

  const existingTeam = await prisma.fantasyTeam.findFirst({
    where: {
      userId: session.user.id,
      matchId: match.id
    },
    include: {
      players: {
        include: { player: true }
      }
    }
  });

  const leagueCheck = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { _count: { select: { members: true } } }
  });

  // If team already submitted, show tabbed view with commentary
  if (existingTeam) {
    return (
      <div className="py-8 max-w-5xl mx-auto space-y-6 px-4">
        <div className="glass-panel p-6 rounded-sm text-center relative overflow-hidden border-green-500/30">
          <div className="absolute -right-10 -bottom-10 text-[150px] text-green-500/5 rotate-12 select-none font-bold">✓</div>
          <div className="text-green-500 mb-3 text-4xl font-bold font-mono tracking-widest relative z-10">LOCKED IN</div>
          <h2 className="text-2xl font-black text-white mb-2 font-mono uppercase tracking-[0.2em] relative z-10">
            {match.team1} <span className="text-red-500">VS</span> {match.team2}
          </h2>
        </div>

        {/* Tabbed interface: YOUR TEAM | LIVE MATCH | SCORECARD */}
        <MatchContestTabs
          matchId={match.id}
          team1={match.team1}
          team2={match.team2}
          existingTeam={JSON.parse(JSON.stringify(existingTeam))}
          leagueId={leagueId}
          membersCount={leagueCheck?._count.members || 2}
          captainId={existingTeam.captainId}
          viceCaptainId={existingTeam.viceCaptainId}
        />
      </div>
    );
  }

  // Fetch players for team building
  const allPlayersRaw = await prisma.player.findMany({
    where: {
      team: { in: [match.team1, match.team2] }
    },
    include: {
      matchAppearances: { where: { matchId: match.id } },
      stats: { orderBy: { season: 'desc' } }
    }
  });

  const allPlayers = allPlayersRaw.map(p => ({
    id: p.id,
    name: p.name,
    team: p.team,
    role: p.role,
    credits: p.credits,
    isPlaying: p.matchAppearances[0]?.isPlaying || false,
    stats: p.stats.map(s => ({
      season: s.season,
      matches: s.matchesPlayed,
      runs: s.runs,
      wickets: s.wickets,
      avg: s.avgPoints
    }))
  }));

  return (
    <div className="py-6 px-4 max-w-7xl mx-auto">
      <div className="text-center mb-8 mt-4 border-b border-white/10 pb-6">
        <h1 className="text-4xl font-black text-white font-mono tracking-widest uppercase">
          <span className="text-gray-500 mr-4">MATCH:</span>
          {match.team1} <span className="text-red-500 text-2xl mx-2">VS</span> {match.team2}
        </h1>
        <p className="text-gray-400 mt-3 font-mono tracking-widest text-sm">COMPILE YOUR 11-PLAYER ROSTER</p>
        {match.status === "IN_PROGRESS" && (
          <div className="mt-3 inline-flex items-center space-x-2 bg-red-500/10 border border-red-500/30 px-3 py-1 rounded-sm">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span className="text-red-500 text-xs font-mono font-bold tracking-widest">MATCH IS LIVE</span>
          </div>
        )}
      </div>

      {/* Live Score & Commentary above team builder for live matches */}
          <LiveMatchCenter compact={true} />

      <TeamBuilderClient
        players={allPlayers}
        matchId={match.id}
        leagueId={leagueId}
        tossCompleted={match.tossCompleted}
        membersCount={leagueCheck?._count.members || 2}
        team1={match.team1}
        team2={match.team2}
      />
    </div>
  );
}
