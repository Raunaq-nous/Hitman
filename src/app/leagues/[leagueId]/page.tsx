import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, Calendar, Trophy } from "lucide-react";
import LeagueTabsClient from "@/components/LeagueTabsClient";

export default async function LeaguePage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  // Verify membership and fetch league
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      members: {
        include: { user: true }
      }
    }
  });

  if (!league) redirect("/dashboard");
  const isMember = league.members.some(m => m.userId === session.user.id);
  if (!isMember) redirect("/dashboard");

  // Fetch upcoming + live matches for the lobby
  const upcomingMatches = await prisma.match.findMany({
    where: { status: { in: ["UPCOMING", "IN_PROGRESS"] } },
    orderBy: { date: "asc" }
  });

  return (
    <div className="py-8">
      <div className="neo-brutal bg-black border border-white/20 rounded-sm p-8 text-white mb-8 relative overflow-hidden">
        {/* Stylized background watermark */}
        <div className="absolute -right-20 -bottom-20 text-[200px] font-black text-white/[0.02] tracking-tighter mix-blend-overlay pointer-events-none select-none">
          {league.inviteCode}
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
          <div>
            <div className="inline-block bg-red-600 text-black px-3 py-1 rounded-sm text-xs font-bold font-mono mb-4 tracking-[0.2em]">
              INVITE CODE: {league.inviteCode}
            </div>
            <h1 className="text-4xl font-extrabold tracking-widest font-mono uppercase">{league.name}</h1>
          </div>
        </div>
      </div>

      <LeagueTabsClient league={league} matches={upcomingMatches} />
    </div>
  );
}
