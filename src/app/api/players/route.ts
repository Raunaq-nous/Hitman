import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const players = await prisma.player.findMany({
      orderBy: { team: "asc" },
      select: { id: true, name: true, team: true, role: true, credits: true },
    });
    return NextResponse.json({ players });
  } catch (err) {
    return NextResponse.json({ players: [] }, { status: 500 });
  }
}
