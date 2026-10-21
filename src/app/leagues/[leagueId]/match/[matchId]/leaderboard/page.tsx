import { pageUserId, orNotFound } from "@/providers/page";
import { contestEntries } from "@/domain/contests/service";
import { Trophy, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function MatchLeaderboardPage({ params }: { params: Promise<{ leagueId: string; matchId: string }> }) {
  const { leagueId, matchId } = await params;
  const userId = await pageUserId();
  const { match, entries } = await orNotFound(contestEntries(userId, leagueId, matchId));
  const teams = entries.map((e) => ({ ...e.team, user: e.user }));

  return (
    <div className="py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Link href={`/leagues/${leagueId}`} className="text-gray-400 hover:text-indigo-600">
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
            <span className="text-sm text-gray-500">Points post once the real scorecard is in.</span>
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
                      <div className="font-bold text-gray-900 text-lg">{team.user.name}&apos;s Team</div>
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
