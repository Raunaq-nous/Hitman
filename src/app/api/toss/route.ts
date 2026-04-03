import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { matchId } = await req.json();

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return NextResponse.json({ message: "Not found" }, { status: 404 });

    // Flip the Toss Status 
    await prisma.match.update({
      where: { id: matchId },
      data: { tossCompleted: !match.tossCompleted }
    });

    return NextResponse.json({ message: "Toss flipped" });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
