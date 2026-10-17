import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest, adminOnly } from "@/lib/admin";
import { parseStatLine, playerPoints, SCORING_VERSION, type StatLine } from "@/lib/scoring";

/**
 * Scores a finished match from its real scorecard. Admin only, and runs once per match.
 * Body: { matchId, stats: { [playerId]: { runs, fours, sixes, wickets, catches, runOuts } } }
 * Random scoring has been removed: points only come from submitted stat lines.
 */
export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return adminOnly();

  let body: { matchId?: string; stats?: Record<string, unknown> } | null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Send a JSON body." }, { status: 400 });
  }
  const matchId = body?.matchId;
  const stats = body?.stats;
  if (!matchId) return NextResponse.json({ message: "matchId is required." }, { status: 400 });
  if (!stats || typeof stats !== "object" || Object.keys(stats).length === 0) {
    return NextResponse.json(
      { message: "Provide per-player stats from the real scorecard. Points are never generated." },
      { status: 400 },
    );
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return NextResponse.json({ message: "Match not found." }, { status: 404 });
  if (match.status === "COMPLETED") {
    return NextResponse.json({ message: "This match has already been scored." }, { status: 409 });
  }

  const lines = new Map<string, StatLine>();
  for (const [playerId, raw] of Object.entries(stats)) {
    const line = parseStatLine(raw);
    if (!line) return NextResponse.json({ message: `Invalid stat line for player ${playerId}.` }, { status: 400 });
    lines.set(playerId, line);
  }

  const teams = await prisma.fantasyTeam.findMany({ where: { matchId }, include: { players: true } });
  const writes = teams.flatMap((team) => {
    let total = 0;
    for (const pick of team.players) {
      const line = lines.get(pick.playerId);
      if (!line) continue;
      const armband = pick.playerId === team.captainId ? "captain" : pick.playerId === team.viceCaptainId ? "vice" : "none";
      total += playerPoints(line, armband);
    }
    return [
      prisma.fantasyTeam.update({ where: { id: team.id }, data: { totalPoints: total } }),
      prisma.user.update({ where: { id: team.userId }, data: { xp: { increment: Math.floor(total / 10) } } }),
    ];
  });

  await prisma.$transaction([...writes, prisma.match.update({ where: { id: matchId }, data: { status: "COMPLETED" } })]);
  return NextResponse.json({ message: "Match scored.", teams: teams.length, scoringVersion: SCORING_VERSION });
}
