import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const mockPlayers = [
  { name: "Virat Kohli", team: "RCB", role: "BATSMAN", credits: 10.5 },
  { name: "Faf du Plessis", team: "RCB", role: "BATSMAN", credits: 9.5 },
  { name: "Glenn Maxwell", team: "RCB", role: "ALL_ROUNDER", credits: 10.0 },
  { name: "Mohammed Siraj", team: "RCB", role: "BOWLER", credits: 8.5 },
  { name: "Dinesh Karthik", team: "RCB", role: "WICKETKEEPER", credits: 8.0 },
  { name: "MS Dhoni", team: "CSK", role: "WICKETKEEPER", credits: 9.0 },
  { name: "Ruturaj Gaikwad", team: "CSK", role: "BATSMAN", credits: 9.5 },
  { name: "Ravindra Jadeja", team: "CSK", role: "ALL_ROUNDER", credits: 10.0 },
  { name: "Deepak Chahar", team: "CSK", role: "BOWLER", credits: 8.5 },
  { name: "Matheesha Pathirana", team: "CSK", role: "BOWLER", credits: 8.0 },
  { name: "Rohit Sharma", team: "MI", role: "BATSMAN", credits: 10.0 },
  { name: "Suryakumar Yadav", team: "MI", role: "BATSMAN", credits: 10.5 },
  { name: "Hardik Pandya", team: "MI", role: "ALL_ROUNDER", credits: 10.0 },
  { name: "Jasprit Bumrah", team: "MI", role: "BOWLER", credits: 10.0 },
  { name: "Ishan Kishan", team: "MI", role: "WICKETKEEPER", credits: 9.0 },
];

export async function POST() {
  try {
    const playersCount = await prisma.player.count();
    
    if (playersCount === 0) {
      await prisma.player.createMany({
        data: mockPlayers
      });
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      await prisma.match.createMany({
        data: [
          { team1: "RCB", team2: "CSK", date: tomorrow, status: "UPCOMING" },
          { team1: "MI", team2: "CSK", date: tomorrow, status: "UPCOMING" }
        ]
      });
      
      return NextResponse.json({ message: "Seeded successfully" });
    }
    
    return NextResponse.json({ message: "Already seeded" });
  } catch (error) {
    return NextResponse.json({ message: "Seeding failed", error }, { status: 500 });
  }
}
