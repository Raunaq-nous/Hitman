import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { validateFantasyTeam, type RulePlayer } from "@/lib/fantasyRules";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Sign in to submit a team." }, { status: 401 });

  try {
    const { matchId, playerIds, captainId, viceCaptainId } = await req.json();
    if (!matchId || !Array.isArray(playerIds) || !captainId || !viceCaptainId) {
      return NextResponse.json({ message: "Invalid team submission." }, { status: 400 });
    }

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return NextResponse.json({ message: "Match not found." }, { status: 404 });
    // Selection closes once an admin moves the match out of UPCOMING at the first ball.
    if (match.status !== "UPCOMING") {
      return NextResponse.json({ message: "Team selection has closed for this match." }, { status: 409 });
    }

    const players: RulePlayer[] = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, team: true, role: true, credits: true },
    });
    const check = validateFantasyTeam({ playerIds, captainId, viceCaptainId }, players, [match.team1, match.team2]);
    if (!check.ok) return NextResponse.json({ message: check.error }, { status: 400 });

    const existing = await prisma.fantasyTeam.findFirst({ where: { userId: session.user.id, matchId } });
    if (existing) return NextResponse.json({ message: "You’ve already submitted a team for this match." }, { status: 400 });

    const fantasyTeam = await prisma.fantasyTeam.create({
      data: {
        userId: session.user.id,
        matchId,
        captainId,
        viceCaptainId,
        players: { create: playerIds.map((id: string) => ({ playerId: id })) },
      },
    });
    return NextResponse.json({ success: true, teamId: fantasyTeam.id }, { status: 201 });
  } catch (error) {
    console.error("Team submission error:", error);
    return NextResponse.json({ message: "Error submitting team." }, { status: 500 });
  }
}
