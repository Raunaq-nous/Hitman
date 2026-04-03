import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Real Playing XI for today's match: CSK vs PBKS (April 3, 2026)
// Toss: PBKS won, elected to bowl first
// Source: india.com, mykhel.com, wisden.com

const CSK_PLAYING_XI = [
  "Ruturaj Gaikwad",
  "Sanju Samson",
  "Ayush Mhatre",
  "Matthew Short",
  "Shivam Dube",
  "Sarfaraz Khan",
  "Jamie Overton",
  "Noor Ahmad",
  "Matt Henry",
  "Anshul Kamboj",
  "Shreyas Gopal",
];

const PBKS_PLAYING_XI = [
  "Shreyas Iyer",
  "Priyansh Arya",
  "Prabhsimran Singh",
  "Cooper Connolly",
  "Nehal Wadhera",
  "Shashank Singh",
  "Marcus Stoinis",
  "Marco Jansen",
  "Xavier Bartlett",
  "Arshdeep Singh",
  "Yuzvendra Chahal",
];

async function main() {
  console.log("🏏 Updating today's match with real toss data...");

  // Find today's match: CSK vs PBKS
  const todayMatch = await prisma.match.findFirst({
    where: {
      team1: "CSK",
      team2: "PBKS",
    },
  });

  if (!todayMatch) {
    console.error("❌ Today's match (CSK vs PBKS) not found!");
    return;
  }

  console.log(`   Found match ID: ${todayMatch.id}`);

  // Update toss result and set match as in-progress
  await prisma.match.update({
    where: { id: todayMatch.id },
    data: {
      tossCompleted: true,
      status: "IN_PROGRESS",
    },
  });
  console.log("   ✅ Toss marked complete: PBKS won, elected to bowl");

  // Get all CSK + PBKS players
  const allPlayers = await prisma.player.findMany({
    where: { team: { in: ["CSK", "PBKS"] } },
  });

  const playingNames = [...CSK_PLAYING_XI, ...PBKS_PLAYING_XI];

  // Delete existing match-player records for this match
  const existingRecords = await prisma.matchPlayer.findMany({
    where: { matchId: todayMatch.id },
  });
  
  if (existingRecords.length > 0) {
    await prisma.matchPlayer.deleteMany({ where: { matchId: todayMatch.id } });
    console.log(`   Cleared ${existingRecords.length} existing matchPlayer records`);
  }

  // Create fresh matchPlayer records with correct playing status
  for (const player of allPlayers) {
    const isPlaying = playingNames.some(
      (name) => name.toLowerCase() === player.name.toLowerCase()
    );
    await prisma.matchPlayer.create({
      data: {
        matchId: todayMatch.id,
        playerId: player.id,
        isPlaying,
      },
    });
  }

  console.log(`   ✅ Playing XI set for ${allPlayers.length} players`);

  // Create 3 test users for contest testing
  console.log("\n👥 Creating 3 test users...");

  const bcrypt = require("bcryptjs");
  const testUsers = [
    { name: "Vaibhavi", email: "vaibhavi@test.com", password: "test123" },
    { name: "Player2", email: "player2@test.com", password: "test123" },
    { name: "Player3", email: "player3@test.com", password: "test123" },
  ];

  for (const u of testUsers) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          name: u.name,
          email: u.email,
          password: await bcrypt.hash(u.password, 10),
        },
      });
      console.log(`   Created: ${u.name} (${u.email})`);
    } else {
      console.log(`   Exists: ${u.name} (${u.email})`);
    }
  }

  console.log("\n✅ Live match setup complete!");
  console.log(`   Match: CSK vs PBKS (${todayMatch.id})`);
  console.log("   Toss: PBKS won → elected to bowl");
  console.log("   Status: IN_PROGRESS");
  console.log("   Test logins: vaibhavi@test.com / player2@test.com / player3@test.com (pwd: test123)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
