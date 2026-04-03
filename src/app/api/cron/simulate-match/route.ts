import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// --- Dream11 Standard Scoring Rules ---
function calculateFantasyPoints(stats: {
  runs: number; fours: number; sixes: number; wickets: number; catches: number;
}, isCaptain: boolean, isViceCaptain: boolean) {
  let points = 0;

  // Batting Engine
  points += stats.runs;
  points += stats.fours * 1; // Boundary bonus
  points += stats.sixes * 2; // Six bonus
  if (stats.runs >= 100) points += 16;
  else if (stats.runs >= 50) points += 8;
  else if (stats.runs >= 30) points += 4;

  // Bowling Engine
  points += stats.wickets * 25;
  if (stats.wickets >= 5) points += 16;
  else if (stats.wickets >= 4) points += 8;

  // Fielding Engine
  points += stats.catches * 8;

  // Multipliers
  if (isCaptain) points *= 2;
  else if (isViceCaptain) points *= 1.5;

  return points;
}

export async function POST() {
  try {
    // 1. Find the next UPCOMING match and mark it as IN_PROGRESS (Simulating match start)
    let targetMatch = await prisma.match.findFirst({
      where: { status: "IN_PROGRESS" },
      include: { 
        playing11: true,
        fantasyTeams: { include: { players: true } }
      }
    });

    if (!targetMatch) {
      targetMatch = await prisma.match.findFirst({
        where: { status: "UPCOMING" },
        include: { 
          playing11: true,
          fantasyTeams: { include: { players: true } }
        },
        orderBy: { date: "asc" }
      });

      if (!targetMatch) {
        return NextResponse.json({ success: true, message: "No matches to simulate." });
      }

      await prisma.match.update({
        where: { id: targetMatch.id },
        data: { status: "IN_PROGRESS" }
      });
    }

    const playingPlayers = targetMatch.playing11.filter(mp => mp.isPlaying);
    
    if (playingPlayers.length === 0) {
      return NextResponse.json({ success: false, message: "Toss not completed yet for this match." });
    }

    // Precalculate random points for all playing players in the match
    const simulatedPlayerStats = playingPlayers.map(mp => {
      const runs = Math.floor(Math.random() * 20);
      const wickets = Math.random() > 0.8 ? Math.floor(Math.random() * 3) : 0;
      const catches = Math.random() > 0.9 ? 1 : 0;
      const fours = Math.floor(runs / 8); 
      const sixes = Math.floor(runs / 15);
      
      return { 
        playerId: mp.playerId, 
        stats: { runs, wickets, catches, fours, sixes } 
      };
    });

    // Recalculate all Fantasy Teams tied to this Match
    for (const team of targetMatch.fantasyTeams) {
      let teamIncrementalPoints = 0;

      for (const selection of team.players) {
        const simulationData = simulatedPlayerStats.find(p => p.playerId === selection.playerId);
        if (simulationData) {
          const generatedPoints = calculateFantasyPoints(
            simulationData.stats,
            team.captainId === selection.playerId,
            team.viceCaptainId === selection.playerId
          );
          teamIncrementalPoints += generatedPoints;
        }
      }

      // Append new generated points
      await prisma.fantasyTeam.update({
        where: { id: team.id },
        data: { totalPoints: team.totalPoints + teamIncrementalPoints }
      });
    }

    // 4. (Optional) End the match randomly ~20% chance
    if (Math.random() > 0.8) {
      await prisma.match.update({
        where: { id: targetMatch.id },
        data: { status: "COMPLETED" }
      });
    }

    return NextResponse.json({ success: true, message: `Simulated ball-by-ball points for ${targetMatch.team1} vs ${targetMatch.team2}` });
  } catch (error: any) {
    console.error("Match Simulator Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
