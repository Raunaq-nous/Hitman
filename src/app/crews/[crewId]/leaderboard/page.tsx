import { pageUserId, orNotFound } from "@/providers/page";
import { getCrewForMember } from "@/domain/crews/service";
import { crewStandings } from "@/domain/contests/service";
import { Trophy, Medal, User } from "lucide-react";
import Link from "next/link";

export default async function CrewStandingsPage({ params }: { params: Promise<{ crewId: string }> }) {
  const { crewId } = await params;
  const userId = await pageUserId();
  const crew = await orNotFound(getCrewForMember(userId, crewId));
  const leaderboard = (await crewStandings(userId, crewId)).map((s) => ({ userId: s.user.id, user: s.user, points: s.points }));

  return (
    <div className="py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Crew standings</h1>
          <p className="text-gray-500 mt-1">{crew.name} · fantasy points from completed matches</p>
        </div>
        <Link href={`/crews/${crew.id}`} className="text-indigo-600 font-semibold hover:underline">
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
