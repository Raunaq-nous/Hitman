import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { matchId, playerIds, captainId, viceCaptainId } = await req.json();

    if (!matchId || !playerIds || playerIds.length !== 11 || !captainId || !viceCaptainId) {
      return NextResponse.json({ message: "Invalid team submission" }, { status: 400 });
    }

    // Ensure the team hasn't been submitted yet
    const existing = await prisma.fantasyTeam.findFirst({
      where: { userId: session.user.id, matchId }
    });

    if (existing) {
      return NextResponse.json({ message: "Team already submitted for this match" }, { status: 400 });
    }

    const fantasyTeam = await prisma.fantasyTeam.create({
      data: {
        userId: session.user.id,
        matchId,
        captainId,
        viceCaptainId,
        players: {
          create: playerIds.map((id: string) => ({ playerId: id }))
        }
      }
    });

    return NextResponse.json({ success: true, teamId: fantasyTeam.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Error submitting team" }, { status: 500 });
  }
}
