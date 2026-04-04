import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { IPL_2026_SCHEDULE } from "@/constants/iplData";

export const dynamic = 'force-dynamic';

const teamsData: Record<string, { BAT: string[], ALL: string[], BOWL: string[], WK: string[] }> = {
  CSK: {
    BAT: ["Ruturaj Gaikwad", "Dewald Brevis", "Ayush Mhatre", "Sarfaraz Khan"],
    ALL: ["Shivam Dube", "Jamie Overton", "Ramakrishna Ghosh", "Matthew Short", "Aman Khan", "Zak Foulkes"],
    BOWL: ["Khaleel Ahmed", "Noor Ahmad", "Anshul Kamboj", "Nathan Ellis", "Shreyas Gopal", "Matt Henry", "Rahul Chahar", "Mukesh Choudhary"],
    WK: ["MS Dhoni", "Sanju Samson", "Urvil Patel"]
  },
  MI: {
    BAT: ["Rohit Sharma", "Suryakumar Yadav", "Tilak Varma", "Sherfane Rutherford", "Danish Malewar"],
    ALL: ["Hardik Pandya", "Naman Dhir", "Will Jacks", "Shardul Thakur", "Mitchell Santner", "Raj Angad Bawa", "Corbin Bosch"],
    BOWL: ["Jasprit Bumrah", "Trent Boult", "Deepak Chahar", "Allah Ghazanfar", "Mayank Markande"],
    WK: ["Quinton de Kock", "Ryan Rickelton", "Robin Minz"]
  },
  RCB: {
    BAT: ["Virat Kohli", "Rajat Patidar", "Devdutt Padikkal", "Tim David"],
    ALL: ["Krunal Pandya", "Venkatesh Iyer", "Romario Shepherd", "Jacob Bethell", "Swapnil Singh"],
    BOWL: ["Josh Hazlewood", "Bhuvneshwar Kumar", "Yash Dayal", "Nuwan Thushara", "Suyash Sharma", "Rasikh Salam"],
    WK: ["Phil Salt", "Jitesh Sharma", "Jordan Cox"]
  },
  KKR: {
    BAT: ["Ajinkya Rahane", "Rinku Singh", "Manish Pandey", "Rovman Powell", "Angkrish Raghuvanshi"],
    ALL: ["Sunil Narine", "Cameron Green", "Ramandeep Singh", "Rachin Ravindra", "Anukul Roy"],
    BOWL: ["Varun Chakaravarthy", "Harshit Rana", "Matheesha Pathirana", "Umran Malik", "Vaibhav Arora", "Akash Deep"],
    WK: ["Finn Allen", "Tim Seifert"]
  },
  RR: {
    BAT: ["Yashasvi Jaiswal", "Shimron Hetmyer", "Shubham Dubey", "Vaibhav Sooryavanshi"],
    ALL: ["Riyan Parag", "Ravindra Jadeja", "Dasun Shanaka", "Yudhvir Singh Charak"],
    BOWL: ["Jofra Archer", "Tushar Deshpande", "Ravi Bishnoi", "Sandeep Sharma", "Nandre Burger", "Kwena Maphaka"],
    WK: ["Dhruv Jurel", "Donovan Ferreira"]
  },
  SRH: {
    BAT: ["Travis Head", "Aniket Verma", "Smaran Ravichandran"],
    ALL: ["Abhishek Sharma", "Nitish Kumar Reddy", "Liam Livingstone", "Harshal Patel", "Kamindu Mendis"],
    BOWL: ["Pat Cummins", "Jaydev Unadkat", "Brydon Carse", "Shivam Mavi", "Eshan Malinga"],
    WK: ["Ishan Kishan", "Heinrich Klaasen"]
  },
  DC: {
    BAT: ["KL Rahul", "Karun Nair", "David Miller", "Prithvi Shaw", "Nitish Rana"],
    ALL: ["Axar Patel", "Sameer Rizvi", "Ashutosh Sharma"],
    BOWL: ["Mitchell Starc", "T. Natarajan", "Mukesh Kumar", "Kuldeep Yadav", "Lungisani Ngidi", "Kyle Jamieson"],
    WK: ["Abishek Porel", "Tristan Stubbs", "Ben Duckett"]
  },
  PBKS: {
    BAT: ["Shreyas Iyer", "Nehal Wadhera", "Shashank Singh", "Priyansh Arya"],
    ALL: ["Marcus Stoinis", "Marco Jansen", "Azmatullah Omarzai", "Musheer Khan", "Harpreet Brar", "Cooper Connolly"],
    BOWL: ["Arshdeep Singh", "Yuzvendra Chahal", "Lockie Ferguson", "Vyshak Vijaykumar", "Yash Thakur"],
    WK: ["Prabhsimran Singh", "Vishnu Vinod"]
  },
  LSG: {
    BAT: ["Aiden Markram", "Himmat Singh", "Matthew Breetzke"],
    ALL: ["Mitchell Marsh", "Ayush Badoni", "Shahbaz Ahamad", "Wanindu Hasaranga", "Abdul Samad", "Arshin Kulkarni"],
    BOWL: ["Mohammad Shami", "Avesh Khan", "Mayank Yadav", "Anrich Nortje", "Mohsin Khan", "M. Siddharth"],
    WK: ["Rishabh Pant", "Nicholas Pooran", "Josh Inglis"]
  },
  GT: {
    BAT: ["Shubman Gill", "Sai Sudharsan", "Shahrukh Khan", "Glenn Phillips"],
    ALL: ["Rashid Khan", "Washington Sundar", "Rahul Tewatia", "Jason Holder", "Nishant Sindhu", "Sai Kishore"],
    BOWL: ["Mohammed Siraj", "Kagiso Rabada", "Prasidh Krishna", "Ishant Sharma", "Manav Suthar"],
    WK: ["Jos Buttler", "Anuj Rawat"]
  }
};

const seasons = [2022, 2023, 2024, 2025, 2026];

const roleMap: Record<string, string> = {
  BAT: "BATSMAN",
  ALL: "ALL_ROUNDER",
  WK: "WICKETKEEPER",
  BOWL: "BOWLER"
};

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function POST() {
  try {
    // FORCE WIPING AND RE-SEEDING EVERY TIME THE USER HITS THIS FOR NOW TO UNBLOCK THEM
    console.log("Wiping all existing fantasy data to force a clean 2026 sync...");
    
    // Ordered deletions to respect foreign key constraints
    await prisma.playerStats.deleteMany({});
    await prisma.matchPlayer.deleteMany({});
    await prisma.fantasyTeamPlayer.deleteMany({});
    await prisma.fantasyTeam.deleteMany({});
    await prisma.match.deleteMany({});
    await prisma.player.deleteMany({});
    
    console.log("Seeding players...");
    for (const [teamId, roles] of Object.entries(teamsData)) {
        for (const [roleKey, playerNames] of Object.entries(roles)) {
          const role = roleMap[roleKey];
          for (const name of playerNames) {
            const credits = Number((Math.random() * 2.5 + 7.0).toFixed(1)); 
            const player = await prisma.player.create({
              data: { name, team: teamId, role, credits: Math.min(credits, 10.0) }
            });

            for (const year of seasons) {
              let runs = 0, wickets = 0;
              if (role === "BATSMAN" || role === "WICKETKEEPER") {
                runs = rand(100, 550);
                wickets = rand(0, 2);
              } else if (role === "BOWLER") {
                runs = rand(0, 80);
                wickets = rand(5, 22);
              } else {
                runs = rand(80, 350);
                wickets = rand(3, 12);
              }
              const matches = rand(5, 14);
              const avg = Number(((runs * 1.2 + wickets * 25) / matches).toFixed(1));

              await prisma.playerStats.create({
                data: { playerId: player.id, season: year, matchesPlayed: matches, runs, wickets, avgPoints: avg }
              });
            }
          }
        }
      }

      console.log("Seeding real IPL 2026 schedule...");
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istTime = new Date(now.getTime() + istOffset);
      const todayStr = istTime.toISOString().split('T')[0];

      for (const fixture of IPL_2026_SCHEDULE) {
        let status = "UPCOMING";
        // Simple logic to properly sync: dates before today are completed, today is IN_PROGRESS (for the UI lobby to show LIVE properly), future is UPCOMING
        if (fixture.date < todayStr) status = "COMPLETED";
        else if (fixture.date === todayStr) status = "IN_PROGRESS";
        else status = "UPCOMING";

        // Parse date properly (so it is midnight UTC of that date)
        const matchDate = new Date(fixture.date + "T14:00:00Z"); // approximate 7:30 PM IST

        const match = await prisma.match.create({
          data: {
            team1: fixture.team1,
            team2: fixture.team2,
            date: matchDate,
            status,
            tossCompleted: status === "COMPLETED",
          }
        });

        // Add dummy playing 11
        const matchSquad = await prisma.player.findMany({
          where: { team: { in: [fixture.team1, fixture.team2] } }
        });

        const playing11Data = matchSquad.map((p: any) => ({
          matchId: match.id,
          playerId: p.id,
          isPlaying: Math.random() > 0.3 
        }));

        await prisma.matchPlayer.createMany({ data: playing11Data });
      }

      return NextResponse.json({ success: true, message: "Successfully synced with original IPL 2026 schedule." });
    } catch (error: any) {
      console.error("Seeding failed", error);
      return NextResponse.json({ success: false, message: "Seeding failed", error: String(error) }, { status: 500 });
    }
  }
