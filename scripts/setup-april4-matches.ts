import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function setupMatch(team1: string, team2: string, status: string, tossCompleted: boolean) {
  console.log(`\n--- Setting up ${team1} vs ${team2} ---`);
  
  // 1. Find the match
  const match = await prisma.match.findFirst({
    where: { team1, team2 },
    orderBy: { date: "asc" }
  });

  if (!match) {
    console.error(`Match not found: ${team1} vs ${team2}`);
    return;
  }

  // 2. Update status
  await prisma.match.update({
    where: { id: match.id },
    data: { status, tossCompleted }
  });

  // 3. Setup Playing 11 (Top 11 from each team in DB)
  const t1Players = await prisma.player.findMany({ where: { team: team1 }, take: 11 });
  const t2Players = await prisma.player.findMany({ where: { team: team2 }, take: 11 });

  // Clear existing
  await prisma.matchPlayer.deleteMany({ where: { matchId: match.id } });

  // Add new
  await prisma.matchPlayer.createMany({
    data: [
      ...t1Players.map(p => ({ matchId: match.id, playerId: p.id, isPlaying: true })),
      ...t2Players.map(p => ({ matchId: match.id, playerId: p.id, isPlaying: true }))
    ]
  });

  console.log(`Success: ${team1} vs ${team2} is now ${status}`);
  return match.id;
}

async function main() {
  try {
    // Match 8: DC vs MI (3:30 PM IST) -> IN_PROGRESS
    const match8Id = await setupMatch("DC", "MI", "IN_PROGRESS", true);

    // Match 9: GT vs RR (7:30 PM IST) -> UPCOMING
    const match9Id = await setupMatch("GT", "RR", "UPCOMING", false);

    // Create a Demo User and Fantasy Team for today's match (Match 8)
    const demoUser = await prisma.user.upsert({
      where: { email: "vaibhav@hitman.ai" },
      update: {},
      create: {
        name: "Vaibhavi Singh",
        email: "vaibhav@hitman.ai",
        password: "password123", // Mock
      }
    });

    if (match8Id) {
      const players = await prisma.player.findMany({
        where: { team: { in: ["DC", "MI"] } },
        take: 11
      });

      if (players.length >= 11) {
        // Clear old teams for this user/match
        await prisma.fantasyTeamPlayer.deleteMany({
          where: { fantasyTeam: { userId: demoUser.id, matchId: match8Id } }
        });
        await prisma.fantasyTeam.deleteMany({
          where: { userId: demoUser.id, matchId: match8Id }
        });

        const fantasyTeam = await prisma.fantasyTeam.create({
          data: {
            userId: demoUser.id,
            matchId: match8Id,
            captainId: players[0].id,
            viceCaptainId: players[1].id,
            totalPoints: 0,
          }
        });

        await prisma.fantasyTeamPlayer.createMany({
          data: players.map(p => ({
            fantasyTeamId: fantasyTeam.id,
            playerId: p.id
          }))
        });
        console.log(`\nDemo Fantasy Team created for Match 8 (DC vs MI)`);
      }
    }

  } catch (error) {
    console.error("Setup Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
