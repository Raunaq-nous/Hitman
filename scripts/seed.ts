import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ipl2026Players = [
  // RCB 2026
  { name: "Virat Kohli", team: "RCB", role: "BATSMAN", credits: 11.0 },
  { name: "Rajat Patidar", team: "RCB", role: "BATSMAN", credits: 8.5 },
  { name: "Faf du Plessis", team: "RCB", role: "BATSMAN", credits: 9.5 },
  { name: "Will Jacks", team: "RCB", role: "ALL_ROUNDER", credits: 9.5 },
  { name: "Cameron Green", team: "RCB", role: "ALL_ROUNDER", credits: 9.5 },
  { name: "Glenn Maxwell", team: "RCB", role: "ALL_ROUNDER", credits: 9.0 },
  { name: "Anuj Rawat", team: "RCB", role: "WICKETKEEPER", credits: 7.5 },
  { name: "Mohammed Siraj", team: "RCB", role: "BOWLER", credits: 9.0 },
  { name: "Yash Dayal", team: "RCB", role: "BOWLER", credits: 8.0 },
  { name: "Lockie Ferguson", team: "RCB", role: "BOWLER", credits: 8.5 },
  { name: "Karn Sharma", team: "RCB", role: "BOWLER", credits: 7.5 },
  
  // CSK 2026
  { name: "Ruturaj Gaikwad", team: "CSK", role: "BATSMAN", credits: 10.0 },
  { name: "Ajinkya Rahane", team: "CSK", role: "BATSMAN", credits: 8.0 },
  { name: "Sameer Rizvi", team: "CSK", role: "BATSMAN", credits: 7.5 },
  { name: "Rachin Ravindra", team: "CSK", role: "ALL_ROUNDER", credits: 9.0 },
  { name: "Shivam Dube", team: "CSK", role: "ALL_ROUNDER", credits: 9.5 },
  { name: "Ravindra Jadeja", team: "CSK", role: "ALL_ROUNDER", credits: 10.0 },
  { name: "MS Dhoni", team: "CSK", role: "WICKETKEEPER", credits: 8.5 },
  { name: "Matheesha Pathirana", team: "CSK", role: "BOWLER", credits: 9.5 },
  { name: "Deepak Chahar", team: "CSK", role: "BOWLER", credits: 8.5 },
  { name: "Maheesh Theekshana", team: "CSK", role: "BOWLER", credits: 8.5 },
  { name: "Tushar Deshpande", team: "CSK", role: "BOWLER", credits: 8.0 },
];

async function main() {
  console.log("Clearing old match data...");
  
  // Delete all existing Fantasy Teams, Matches, and Players safely
  await prisma.fantasyTeamPlayer.deleteMany();
  await prisma.fantasyTeam.deleteMany();
  await prisma.player.deleteMany();
  await prisma.match.deleteMany();

  console.log("Seeding authentic IPL 2026 Mock Data (22 Players)...");
  
  await prisma.player.createMany({
    data: ipl2026Players
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  await prisma.match.create({
    data: {
      team1: "RCB",
      team2: "CSK",
      date: tomorrow,
      status: "UPCOMING"
    }
  });

  console.log("Database seeded successfully with 22 active players for the match!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
