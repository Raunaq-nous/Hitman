import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Trophy, Medal, User } from "lucide-react";
import Link from "next/link";

export default async function LeagueLeaderboardPage({ params }: { params: { leagueId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const league = await prisma.league.findUnique({
    where: { id: params.leagueId },
    include: { members: { include: { user: true } } }
  });
  if (!league) redirect("/dashboard");

  // Sum up all fantasy team points across all COMPLETED matches per user, filtered for this league?
  // Wait, FantasyTeams are per Match, and Match is global. 
  // If users are in multiple leagues, we just sum their FantasyTeam points for all matches in the platform.
  // Standard fantasy way: League points = Sum of user's points across all matches.

  const memberIds = league.members.map(m => m.userId);

  const aggregates = await prisma.fantasyTeam.groupBy({
    by: ['userId'],
    where: {
      userId: { in: memberIds },
      match: { status: "COMPLETED" }
    },
    _sum: {
      totalPoints: true
    }
  });

  const memberMap = new Map(league.members.map(m => [m.userId, m.user]));
  
  const leaderboard = aggregates
    .map(agg => ({
      userId: agg.userId,
      user: memberMap.get(agg.userId)!,
      points: agg._sum.totalPoints || 0
    }))
    .sort((a, b) => b.points - a.points);

  // Users with 0 points
  league.members.forEach(m => {
    if (!leaderboard.some(l => l.userId === m.userId)) {
      leaderboard.push({ userId: m.userId, user: m.user, points: 0 });
    }
  });

  return (
    <div className="py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">League Leaderboard</h1>
          <p className="text-gray-500 mt-1">{league.name} - Universal Rankings</p>
        </div>
        <Link href={`/leagues/${league.id}`} className="text-indigo-600 font-semibold hover:underline">
          Back to Lobby
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-indigo-600 px-6 py-4 text-white flex items-center font-bold">
          <Trophy className="mr-2 text-yellow-400" /> Overall Standings
        </div>
        <div className="divide-y divide-gray-100">
          {leaderboard.map((entry, idx) => (
            <div key={entry.userId} className={`px-6 py-4 flex items-center justify-between ${idx < 3 ? 'bg-yellow-50/30' : ''}`}>
              <div className="flex items-center space-x-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-yellow-400 text-yellow-900 shadow-sm' : idx === 1 ? 'bg-gray-300 text-gray-800' : idx === 2 ? 'bg-orange-300 text-orange-900' : 'bg-gray-100 text-gray-500'}`}>
                  {idx + 1}
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700">
                    <User size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{entry.user.name}</div>
                    <div className="text-xs text-gray-500">XP: {entry.user.xp}</div>
                  </div>
                </div>
              </div>
              <div className="text-xl font-black text-indigo-600">
                {entry.points.toFixed(1)} <span className="text-sm text-gray-400 font-medium">pts</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
