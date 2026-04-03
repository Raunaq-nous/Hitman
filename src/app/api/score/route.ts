import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const { matchId } = await req.json();
    if (!matchId) return NextResponse.json({ message: "Match ID required" }, { status: 400 });

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return NextResponse.json({ message: "Match not found" }, { status: 404 });

    // Load Scoring Config
    const configPath = path.join(process.cwd(), "config", "scoring.json");
    const scoringRules = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    const players = await prisma.player.findMany({
      where: { team: { in: [match.team1, match.team2] } }
    });

    // Generate mock stats and points per player
    const playerPointsMap: Record<string, number> = {};
    
    players.forEach((p: any) => {
      // Mock stats
      const runs = Math.floor(Math.random() * 80);
      const fours = Math.floor(runs / 8);
      const sixes = Math.floor(runs / 12);
      const wickets = p.role === "BOWLER" || p.role === "ALL_ROUNDER" ? Math.floor(Math.random() * 4) : 0;
      const catches = Math.floor(Math.random() * 3);
      const runouts = Math.random() > 0.8 ? 1 : 0;

      // Calculate base points
      const points = 
        (runs * scoringRules.RUN) +
        (fours * scoringRules.BOUNDARY) +
        (sixes * scoringRules.SIX) +
        (wickets * scoringRules.WICKET) +
        (catches * scoringRules.CATCH) +
        (runouts * scoringRules.RUNOUT);

      playerPointsMap[p.id] = points;
    });

    // Score all fantasy teams for this match
    const teams = await prisma.fantasyTeam.findMany({
      where: { matchId },
      include: { players: true }
    });

    for (const team of teams) {
      let totalPoints = 0;

      team.players.forEach((fp: any) => {
        let pPoints = playerPointsMap[fp.playerId] || 0;
        
        if (fp.playerId === team.captainId) {
          pPoints *= scoringRules.CAPTAIN_MULTIPLIER;
        } else if (fp.playerId === team.viceCaptainId) {
          pPoints *= scoringRules.VICE_CAPTAIN_MULTIPLIER;
        }

        totalPoints += pPoints;
      });

      // Update team points
      await prisma.fantasyTeam.update({
        where: { id: team.id },
        data: { totalPoints }
      });
      
      // Update User XP
      await prisma.user.update({
        where: { id: team.userId },
        data: { xp: { increment: Math.floor(totalPoints / 10) } }
      });
    }

    // Mark match as COMPLETED
    await prisma.match.update({
      where: { id: matchId },
      data: { status: "COMPLETED" }
    });

    return NextResponse.json({ message: "Match simulated and scored successfully" }, { status: 200 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Scoring failed" }, { status: 500 });
  }
}
