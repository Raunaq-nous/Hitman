import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import TeamBuilderClient from "@/components/TeamBuilderClient";

export default async function MatchContestPage({
  params
}: {
  params: { leagueId: string; matchId: string }
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const match = await prisma.match.findUnique({
    where: { id: params.matchId }
  });

  if (!match) redirect(`/leagues/${params.leagueId}`);

  // Need to check if user already built a team for this match
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

  if (existingTeam) {
    return (
      <div className="py-12 flex justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center border border-gray-100 max-w-lg">
          <div className="text-green-500 mb-4 text-6xl">✓</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Submitted!</h2>
          <p className="text-gray-600 mb-6">You have already submitted a team for {match.team1} vs {match.team2}. Wait for the match to finish to see the points.</p>
          <a href={`/leagues/${params.leagueId}`} className="text-indigo-600 font-semibold hover:underline">
            Back to League
          </a>
        </div>
      </div>
    );
  }

  // Fetch players for the match
  // In real app, we fetch players based on match.team1 and match.team2
  // We'll fetch players matching either team1 or team2
  const allPlayers = await prisma.player.findMany({
    where: {
      team: { in: [match.team1, match.team2] }
    }
  });

  return (
    <div className="py-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-gray-900">{match.team1} vs {match.team2}</h1>
        <p className="text-gray-500">Pick your best 11 players for this Match</p>
      </div>

      <TeamBuilderClient 
        players={allPlayers} 
        matchId={match.id} 
        leagueId={params.leagueId} 
      />
    </div>
  );
}
