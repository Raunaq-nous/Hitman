import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { inviteCode } = await req.json();
    if (!inviteCode) return NextResponse.json({ message: "Invite code required" }, { status: 400 });

    const league = await prisma.league.findUnique({
      where: { inviteCode }
    });

    if (!league) return NextResponse.json({ message: "League not found" }, { status: 404 });

    // Check if user is already a member
    const existingMember = await prisma.leagueMember.findUnique({
      where: {
        userId_leagueId: {
          userId: session.user.id,
          leagueId: league.id
        }
      }
    });

    if (existingMember) {
      return NextResponse.json({ message: "Already a member of this league" }, { status: 400 });
    }

    await prisma.leagueMember.create({
      data: {
        userId: session.user.id,
        leagueId: league.id
      }
    });

    return NextResponse.json(league, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Error joining league" }, { status: 500 });
  }
}
