import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Trophy, ArrowLeft } from "lucide-react";
import Link from "next/link";
import SimulateMatchButton from "@/components/SimulateMatchButton";

export default async function MatchLeaderboardPage({ params }: { params: { leagueId: string; matchId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const match = await prisma.match.findUnique({ where: { id: params.matchId } });
  if (!match) redirect(`/leagues/${params.leagueId}`);

  // Get league to filter teams only for users in this league
  const league = await prisma.league.findUnique({
    where: { id: params.leagueId },
    include: { members: true }
  });
  const memberIds = league?.members.map(m => m.userId) || [];

  const teams = await prisma.fantasyTeam.findMany({
    where: { 
      matchId: params.matchId,
      userId: { in: memberIds }
    },
    include: {
      user: true,
      players: { include: { player: true } }
    },
    orderBy: { totalPoints: 'desc' }
  });

  return (
    <div className="py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Link href={`/leagues/${params.leagueId}`} className="text-gray-400 hover:text-indigo-600">
              <ArrowLeft size={20} />
            </Link>
            <span className="text-sm font-semibold uppercase tracking-widest text-indigo-600">
              Match Center
            </span>
          </div>
          <h1 className="text-3xl font-black text-gray-900">{match.team1} vs {match.team2}</h1>
        </div>
        <div>
          {match.status === "UPCOMING" && (
            <SimulateMatchButton matchId={match.id} />
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-900 to-indigo-900 px-6 py-4 text-white flex items-center justify-between font-bold">
          <div className="flex items-center"><Trophy className="mr-2 text-yellow-400" /> Match Leaderboard Mode</div>
          <div className="text-sm bg-white/20 px-3 py-1 rounded-full">{match.status}</div>
        </div>
        
        {teams.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No teams submitted for this match yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {teams.map((team, idx) => (
              <div key={team.id} className="p-6 hover:bg-gray-50 transition">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl font-black text-gray-300 w-8 text-center">{idx + 1}</div>
                    <div>
                      <div className="font-bold text-gray-900 text-lg">{team.user.name}'s Team</div>
                      <div className="text-xs text-gray-500">
                        {team.players.length} Players Picked
                      </div>
                    </div>
                  </div>
                  <div className="text-2xl font-black text-indigo-600">
                    {team.totalPoints.toFixed(1)} <span className="text-sm font-medium text-gray-400">pts</span>
                  </div>
                </div>

                {/* Show some detail if completed */}
                {match.status === "COMPLETED" && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 bg-gray-50 p-4 rounded-xl text-sm border border-gray-100">
                    {team.players.filter(p => p.playerId === team.captainId).map(p => (
                      <div key={p.playerId} className="col-span-1">
                        <span className="text-xs text-gray-400 uppercase font-bold block">Captain (2x)</span>
                        <span className="font-semibold">{p.player.name}</span>
                      </div>
                    ))}
                    {team.players.filter(p => p.playerId === team.viceCaptainId).map(p => (
                      <div key={p.playerId} className="col-span-1">
                        <span className="text-xs text-gray-400 uppercase font-bold block">Vice Captain (1.5x)</span>
                        <span className="font-semibold">{p.player.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
