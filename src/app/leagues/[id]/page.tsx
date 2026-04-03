import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, Calendar, Trophy } from "lucide-react";

export default async function LeaguePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  // Verify membership and fetch league
  const league = await prisma.league.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: { user: true }
      }
    }
  });

  if (!league) redirect("/dashboard");
  const isMember = league.members.some(m => m.userId === session.user.id);
  if (!isMember) redirect("/dashboard");

  // Fetch upcoming matches for the lobby
  const upcomingMatches = await prisma.match.findMany({
    where: { status: "UPCOMING" },
    orderBy: { date: "asc" }
  });

  return (
    <div className="py-8">
      <div className="bg-indigo-600 rounded-3xl p-8 text-white mb-8 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <div className="inline-block bg-indigo-800 px-3 py-1 rounded-full text-xs font-bold mb-3 uppercase tracking-wider">
              League Invite Code: {league.inviteCode}
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">{league.name}</h1>
          </div>
          <div className="mt-4 md:mt-0 flex items-center bg-indigo-700 px-4 py-2 rounded-xl">
            <Users size={20} className="mr-2" />
            <span className="font-semibold">{league.members.length} Members</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center border-b pb-4">
            <Calendar className="mr-2 text-indigo-600" />
            Match Lobby
          </h2>
          
          {upcomingMatches.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col items-center">
              <p className="text-gray-500 mb-4">No upcoming matches found.</p>
              <form action="/api/seed" method="POST">
                <button type="submit" className="text-sm bg-gray-100 px-4 py-2 rounded-md hover:bg-gray-200">
                  Seed Mock Matches (Admin)
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingMatches.map((match) => (
                <div key={match.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-200 hover:shadow-md transition">
                  <div className="flex flex-col sm:flex-row justify-between items-center">
                    <div className="flex items-center space-x-6 w-full sm:w-auto">
                      <div className="text-xl font-black text-gray-800">{match.team1}</div>
                      <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-bold">VS</div>
                      <div className="text-xl font-black text-gray-800">{match.team2}</div>
                    </div>
                    
                    <div className="mt-4 sm:mt-0 flex flex-col sm:items-end w-full sm:w-auto">
                      <div className="text-sm text-gray-500 mb-2 font-medium">
                        {new Date(match.date).toLocaleString()}
                      </div>
                      <Link 
                        href={`/leagues/${league.id}/match/${match.id}`} 
                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition text-center"
                      >
                        Join Contest
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Trophy className="mr-2 text-yellow-500" />
              League Members
            </h3>
            <ul className="space-y-4">
              {league.members.map((m) => (
                <li key={m.id} className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg">
                  <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold uppercase">
                    {m.user.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 line-clamp-1">{m.user.name}</p>
                    <p className="text-xs text-gray-500">XP: {m.user.xp}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
