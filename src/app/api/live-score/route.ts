import { NextRequest, NextResponse } from "next/server";
import { IPL_2026_SCHEDULE, IPL_TEAMS as FULL_IPL_TEAMS } from "../../../constants/iplData";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ─── Server-side cache (30-second TTL to conserve API quota) ───
let cachedData: any = null;
let lastFetchTime = 0;
const CACHE_TTL = 30_000; // 30 seconds

// ─── IPL Team short names ───
const IPL_TEAMS: Record<string, string> = {
  "Chennai Super Kings": "CSK",
  "Mumbai Indians": "MI",
  "Royal Challengers Bengaluru": "RCB",
  "Royal Challengers Bangalore": "RCB",
  "Kolkata Knight Riders": "KKR",
  "Delhi Capitals": "DC",
  "Rajasthan Royals": "RR",
  "Punjab Kings": "PBKS",
  "Sunrisers Hyderabad": "SRH",
  "Gujarat Titans": "GT",
  "Lucknow Super Giants": "LSG",
};

function getShortName(team: string): string {
  return IPL_TEAMS[team] || team.split(" ").map(w => w[0]).join("");
}

function parseScore(scoreArr: any[]): { runs: number; wickets: number; overs: string; inning: string }[] {
  if (!scoreArr || !Array.isArray(scoreArr)) return [];
  return scoreArr.map(s => ({
    runs: s.r || 0,
    wickets: s.w || 0,
    overs: String(s.o || "0"),
    inning: s.inning || "",
  }));
}

function buildLiveData(match: any) {
  const scores = parseScore(match.score);
  const teams = match.teams || [];
  const teamInfo = match.teamInfo || [];
  const isLive = match.matchStarted && !match.matchEnded;

  // Determine current innings
  const currentInnings = scores.length;
  const latestScore = scores[scores.length - 1];
  const firstInningsScore = scores.length >= 1 ? scores[0] : null;

  // Build score string
  let scoreStr = "";
  let statusStr = match.status || "";

  if (latestScore) {
    // Determine which team is batting
    const inningStr = latestScore.inning.toLowerCase();
    let battingTeam = "";
    for (const team of teams) {
      if (inningStr.includes(team.toLowerCase().split(" ")[0].toLowerCase())) {
        battingTeam = team;
        break;
      }
    }
    if (!battingTeam && teams.length > 0) {
      // For innings 2, the inning string sometimes has both teams
      battingTeam = currentInnings === 1 ? teams[0] : teams[1];
    }

    const shortBat = getShortName(battingTeam);
    scoreStr = `${shortBat}: ${latestScore.runs}/${latestScore.wickets} (${latestScore.overs})`;

    // If 2nd innings, show target info
    if (scores.length >= 2 && firstInningsScore) {
      const target = firstInningsScore.runs + 1;
      const needed = target - latestScore.runs;
      const ballsLeft = Math.max(0, 120 - Math.floor(parseFloat(latestScore.overs)) * 6 - (parseFloat(latestScore.overs) % 1) * 10);
      if (isLive && needed > 0) {
        statusStr = `${battingTeam} need ${needed} runs from ${ballsLeft} balls`;
      }
    }
  }

  // Build both innings data for scorecard
  const innings1Data = firstInningsScore ? {
    battingTeam: (() => {
      const inningStr = firstInningsScore.inning.toLowerCase();
      for (const team of teams) {
        if (inningStr.includes(team.toLowerCase().split(" ")[0].toLowerCase())) return team;
      }
      return teams[0] || "Team 1";
    })(),
    bowlingTeam: teams[1] || "Team 2",
    totalRuns: firstInningsScore.runs,
    totalWickets: firstInningsScore.wickets,
    overs: firstInningsScore.overs,
    runRate: parseFloat((firstInningsScore.runs / Math.max(0.1, parseFloat(firstInningsScore.overs))).toFixed(2)),
    isCompleted: scores.length >= 2,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
    batsmen: [],
    bowlers: [],
    fallOfWickets: [],
    partnerships: [],
  } : null;

  const innings2Score = scores.length >= 2 ? scores[1] : null;
  const innings2Data = innings2Score ? {
    battingTeam: (() => {
      const inningStr = innings2Score.inning.toLowerCase();
      for (const team of teams) {
        if (inningStr.includes(team.toLowerCase().split(" ")[0].toLowerCase())) return team;
      }
      return teams[1] || "Team 2";
    })(),
    bowlingTeam: teams[0] || "Team 1",
    totalRuns: innings2Score.runs,
    totalWickets: innings2Score.wickets,
    overs: innings2Score.overs,
    runRate: parseFloat((innings2Score.runs / Math.max(0.1, parseFloat(innings2Score.overs))).toFixed(2)),
    isCompleted: match.matchEnded,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
    batsmen: [],
    bowlers: [],
    fallOfWickets: [],
    partnerships: [],
  } : null;

  // Team logos
  const team1Info = teamInfo.find((t: any) => t.name === teams[0]);
  const team2Info = teamInfo.find((t: any) => t.name === teams[1]);

  return {
    source: "CRICKETDATA.ORG (LIVE)",
    matchId: match.id,
    matchName: match.name,
    matchType: match.matchType,
    score: scoreStr || "Match not started",
    status: statusStr,
    overs: latestScore?.overs || "0",
    isLive,
    matchStarted: match.matchStarted,
    matchEnded: match.matchEnded,
    teams: teams.map((t: string, i: number) => ({
      name: t,
      shortName: getShortName(t),
      img: i === 0 ? team1Info?.img : team2Info?.img,
    })),
    scores: scores.map(s => ({
      runs: s.runs,
      wickets: s.wickets,
      overs: s.overs,
      inning: s.inning,
    })),
    recentBalls: [],
    currentBatsmen: [],
    currentBowler: null,
    nextBatsman: null,
    tossWinner: "",
    tossDecision: statusStr.toLowerCase().includes("opt to") ? statusStr : "",
    target: scores.length >= 2 && firstInningsScore ? firstInningsScore.runs + 1 : null,
    currentInnings,
    lastUpdated: new Date().toISOString(),
    innings1: innings1Data,
    innings2: innings2Data,
    commentary: [],
    totalCommentaryCount: 0,
    matchResult: match.matchEnded ? statusStr : null,
    venue: match.venue || "",
    date: match.date,
    seriesId: match.series_id,
  };
}

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.CRICKET_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "API key not configured" }, { status: 500 });
    }

    const now = Date.now();

    // Return cached data if within TTL
    if (cachedData && (now - lastFetchTime) < CACHE_TTL) {
      return NextResponse.json({ success: true, data: cachedData, cached: true });
    }

    // Fetch from CricketData.org
    const response = await fetch(
      `https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`,
      { next: { revalidate: 30 } }
    );

    if (!response.ok) {
      throw new Error(`CricketData API error: ${response.status}`);
    }

    const json = await response.json();

    if (json.status !== "success" || !json.data) {
      throw new Error("Invalid API response");
    }

    // ==== 0. DATE PREPARATION ====
    const nowDate = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(nowDate.getTime() + istOffset);
    const todayStr = istTime.toISOString().split('T')[0];
    
    const todaysMatches = IPL_2026_SCHEDULE.filter(m => m.date === todayStr);

    // ==== 1. FETCH SIMULATED MATCHES FROM DB ====
    // Remove strict date filter for matches already marked as IN_PROGRESS or UPCOMING.
    // If it's in progress in the DB, it's live!
    const dbLiveMatches = await prisma.match.findMany({
      where: {
        status: { in: ["IN_PROGRESS", "UPCOMING"] }
      },
      include: { playing11: true }
    });

    const simulatedIPLMatches = dbLiveMatches.map(m => {
      const t1 = FULL_IPL_TEAMS.find(t => t.shortName === m.team1);
      const t2 = FULL_IPL_TEAMS.find(t => t.shortName === m.team2);
      
      // Basic simulation stats if match is "Live" in DB
      const isLive = m.status === "IN_PROGRESS";
      const dummyScore = isLive ? [
        { inning: `${m.team1} 1st Inning`, runs: 85, wickets: 2, overs: "10.4" }
      ] : [];

      return {
        source: "SIMULATED (DB)",
        matchId: m.id,
        matchName: `${t1?.name || m.team1} vs ${t2?.name || m.team2}`,
        matchType: "t20",
        score: isLive ? `${m.team1}: 85/2 (10.4)` : "Match haven't started",
        status: isLive ? `${t1?.shortName} chose to bat` : `Scheduled at ${t1?.venue || "TBD"}`,
        overs: isLive ? "10.4" : "0",
        isLive: isLive,
        matchStarted: isLive,
        matchEnded: false,
        teams: [
          { name: t1?.name || m.team1, shortName: m.team1, img: t1?.logoUrl || "" },
          { name: t2?.name || m.team2, shortName: m.team2, img: t2?.logoUrl || "" }
        ],
        scores: dummyScore,
        target: null,
        currentInnings: 1,
        lastUpdated: new Date().toISOString(),
        innings1: null,
        innings2: null,
        matchResult: null,
        venue: t1?.venue || "TBD",
        date: m.date.toISOString(),
        tossDecision: m.tossCompleted ? "Toss completed in simulation" : "Toss pending"
      };
    });

    const fallbackMatch = todaysMatches.length > 0 ? todaysMatches[0] : IPL_2026_SCHEDULE[7]; 
    const team1Name = FULL_IPL_TEAMS.find(t => t.shortName === fallbackMatch.team1)?.name || fallbackMatch.team1;
    const team2Name = FULL_IPL_TEAMS.find(t => t.shortName === fallbackMatch.team2)?.name || fallbackMatch.team2;

    const dummyIPLData = {
      source: "MOCK DATA (SIMULATION)",
      matchId: `mock-${fallbackMatch.match}`,
      matchName: `${team1Name} vs ${team2Name}`,
      matchType: "t20",
      score: `${fallbackMatch.team1}: 0/0 (0.0)`,
      status: `Upcoming match at ${fallbackMatch.venue}`,
      overs: "0.0",
      isLive: false,
      matchStarted: false,
      matchEnded: false,
      teams: [
        { name: team1Name, shortName: fallbackMatch.team1, img: "" },
        { name: team2Name, shortName: fallbackMatch.team2, img: "" }
      ],
      scores: [],
      target: null,
      currentInnings: 1,
      lastUpdated: new Date().toISOString(),
      innings1: null,
      innings2: null,
      matchResult: null,
      venue: fallbackMatch.venue,
      date: new Date().toISOString(),
      tossDecision: "Toss pending. Match hasn't started yet."
    };

    // Filter IPL matches and other T20 matches
    const allMatches = json.data;
    const iplMatches = allMatches.filter((m: any) =>
      m.name?.toLowerCase().includes("indian premier league") ||
      m.name?.toLowerCase().includes("ipl") ||
      m.series_id === "87c62aac-bc3c-4738-ab93-19da0690488f"
    );

    // Build response — prioritize DB Live, then real Live IPL, then completed IPL
    const liveIPL = iplMatches.filter((m: any) => m.matchStarted && !m.matchEnded);
    
    // FILTER OUT YESTERDAY'S MATCHES FROM REAL API (Strict Date Check)
    const filteredLiveReal = liveIPL.filter((m: any) => {
      const matchDate = m.date?.split('T')[0];
      return matchDate === todayStr; 
    });

    // Primary match: Simulated Live > Real Live > Simulated Mock
    const primaryData = simulatedIPLMatches.find(m => m.isLive) 
                       || (filteredLiveReal.length > 0 ? buildLiveData(filteredLiveReal[0]) : null)
                       || (simulatedIPLMatches.length > 0 ? simulatedIPLMatches[0] : dummyIPLData);

    // All IPL matches for the sidebar
    const allIPLData = [...simulatedIPLMatches];
    if (filteredLiveReal.length > 0) allIPLData.push(...filteredLiveReal.map((m: any) => buildLiveData(m)));
    if (allIPLData.length === 0) allIPLData.push(dummyIPLData);

    const result = {
      primary: primaryData,
      iplMatches: allIPLData,
      allMatches: [], // Enforce only IPL matches inside the interface
      apiInfo: {
        hitsToday: json.info?.hitsToday,
        hitsLimit: json.info?.hitsLimit,
        hitsUsed: json.info?.hitsUsed,
      },
    };

    // Cache the result
    cachedData = result;
    lastFetchTime = now;

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Live score API error:", error);

    // Return cached data if available
    if (cachedData) {
      return NextResponse.json({ success: true, data: cachedData, cached: true, stale: true });
    }

    // ==== FALLBACK MOCK DATA ==== (Reuse logic from above)
    const nowDate = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(nowDate.getTime() + istOffset);
    const todayStr = istTime.toISOString().split('T')[0];
    
    const todaysMatchesFbList = IPL_2026_SCHEDULE.filter(m => m.date === todayStr);
    const fallbackMatchFb = todaysMatchesFbList.length > 0 ? todaysMatchesFbList[0] : IPL_2026_SCHEDULE[7]; 

    const t1 = FULL_IPL_TEAMS.find(t => t.shortName === fallbackMatchFb.team1);
    const t2 = FULL_IPL_TEAMS.find(t => t.shortName === fallbackMatchFb.team2);

    const dummyIPLData = {
      source: "MOCK DATA (FALLBACK)",
      matchId: `mock-${fallbackMatchFb.match}`,
      matchName: `${t1?.name || fallbackMatchFb.team1} vs ${t2?.name || fallbackMatchFb.team2}`,
      matchType: "t20",
      score: `${fallbackMatchFb.team1}: 0/0 (0.0)`,
      status: `Upcoming match at ${fallbackMatchFb.venue}`,
      overs: "0.0",
      isLive: false,
      matchStarted: false,
      matchEnded: false,
      teams: [
        { name: t1?.name || fallbackMatchFb.team1, shortName: fallbackMatchFb.team1, img: t1?.logoUrl || "" },
        { name: t2?.name || fallbackMatchFb.team2, shortName: fallbackMatchFb.team2, img: t2?.logoUrl || "" }
      ],
      scores: [],
      target: null,
      currentInnings: 1,
      lastUpdated: new Date().toISOString(),
      innings1: null,
      innings2: null,
      matchResult: null,
      venue: fallbackMatchFb.venue,
      date: new Date().toISOString(),
      tossDecision: "Toss pending. Match hasn't started yet."
    };

    return NextResponse.json({
      success: true,
      data: {
        primary: dummyIPLData,
        iplMatches: [dummyIPLData],
        allMatches: [],
        apiInfo: { hitsToday: 0, hitsLimit: 100, hitsUsed: 0 }
      },
      fallback: true
    });
  }
}
