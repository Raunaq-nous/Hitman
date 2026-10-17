import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { randomInt } from "crypto";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newInviteCode = () => Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        ownedLeagues: true,
        leagueMembers: {
          include: { league: true }
        }
      }
    });

    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    const joinedLeagues = user.leagueMembers.map((lm: any) => lm.league);

    return NextResponse.json({ ownedLeagues: user.ownedLeagues, joinedLeagues });
  } catch (error) {
    return NextResponse.json({ message: "Error fetching leagues" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { name } = await req.json();
    if (!name) return NextResponse.json({ message: "League name required" }, { status: 400 });

    // Generate random 6 character code
    const inviteCode = newInviteCode();

    const league = await prisma.league.create({
      data: {
        name,
        inviteCode,
        ownerId: session.user.id,
        members: {
          create: {
            userId: session.user.id
          }
        }
      }
    });

    return NextResponse.json(league, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Error creating league" }, { status: 500 });
  }
}
