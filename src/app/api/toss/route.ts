import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest, adminOnly } from "@/lib/admin";

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return adminOnly();
  try {
    const { matchId } = await req.json();
    if (!matchId) return NextResponse.json({ message: "matchId is required." }, { status: 400 });
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return NextResponse.json({ message: "Match not found." }, { status: 404 });
    await prisma.match.update({ where: { id: matchId }, data: { tossCompleted: !match.tossCompleted } });
    return NextResponse.json({ message: match.tossCompleted ? "Toss reset." : "Toss marked complete." });
  } catch (e) {
    console.error("Toss route error:", e);
    return NextResponse.json({ message: "Couldn’t update the toss." }, { status: 500 });
  }
}
