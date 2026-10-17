import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Live IPL scores from CricketData.org. Nothing here is ever simulated or padded with mock data.
const SOURCE = "CricketData.org";
const IPL_SERIES_ID = "87c62aac-bc3c-4738-ab93-19da0690488f";
const CACHE_TTL_MS = 30_000;

const SHORT_NAMES: Record<string, string> = {
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

type ApiScore = { r?: number; w?: number; o?: number | string; inning?: string };
type ApiTeamInfo = { name: string; img?: string };
type ApiMatch = {
  id: string; name?: string; matchType?: string; status?: string; venue?: string; date?: string; series_id?: string;
  teams?: string[]; teamInfo?: ApiTeamInfo[]; score?: ApiScore[]; matchStarted?: boolean; matchEnded?: boolean;
};
type Innings = { runs: number; wickets: number; overs: string; balls: number; inning: string };

// Per-instance cache to protect the API quota. Moves to Redis with the ingestion worker in Phase 1.
let cache: { at: number; payload: Record<string, unknown> } | null = null;

const shortName = (team: string) => SHORT_NAMES[team] ?? team.split(" ").map((w) => w[0]).join("");

// "10.4" overs is 10 overs and 4 balls, i.e. 64 balls, not 10.4 overs.
function ballsFromOvers(overs: string | number | undefined): number {
  const [whole, part = "0"] = String(overs ?? "0").split(".");
  return (parseInt(whole, 10) || 0) * 6 + (parseInt(part, 10) || 0);
}

const runRate = (runs: number, balls: number) => (balls > 0 ? Number(((runs * 6) / balls).toFixed(2)) : 0);
const ballsPerInnings = (matchType?: string) => (matchType === "t20" ? 120 : matchType === "odi" ? 300 : null);

// Match the full team name, longest first, so "Royal" can never stand in for two different teams.
function battingSide(inning: string, teams: string[]): string | null {
  const s = inning.toLowerCase();
  return [...teams].sort((a, b) => b.length - a.length).find((t) => s.includes(t.toLowerCase())) ?? null;
}

function toInnings(score: ApiScore[] | undefined): Innings[] {
  if (!Array.isArray(score)) return [];
  return score.map((s) => {
    const overs = String(s.o ?? "0");
    return { runs: s.r ?? 0, wickets: s.w ?? 0, overs, balls: ballsFromOvers(overs), inning: s.inning ?? "" };
  });
}

function buildMatch(m: ApiMatch, fetchedAt: string) {
  const teams = m.teams ?? [];
  const innings = toInnings(m.score);
  const isLive = !!m.matchStarted && !m.matchEnded;
  const latest = innings[innings.length - 1];
  const first = innings[0];

  const side = (inn: Innings, fallbackIndex: number) => {
    const batting = battingSide(inn.inning, teams) ?? teams[fallbackIndex] ?? `Team ${fallbackIndex + 1}`;
    const bowling = teams.find((t) => t !== batting) ?? `Team ${fallbackIndex === 0 ? 2 : 1}`;
    return { batting, bowling };
  };

  let score = "Match not started";
  let status = m.status ?? "";
  if (latest) {
    const { batting } = side(latest, innings.length - 1);
    score = `${shortName(batting)}: ${latest.runs}/${latest.wickets} (${latest.overs})`;
    const perInnings = ballsPerInnings(m.matchType);
    if (isLive && innings.length >= 2 && first && perInnings) {
      const needed = first.runs + 1 - latest.runs;
      const ballsLeft = perInnings - latest.balls;
      if (needed > 0 && ballsLeft > 0) status = `${batting} need ${needed} runs from ${ballsLeft} balls`;
    }
  }

  const inningsData = (inn: Innings | undefined, index: number) => {
    if (!inn) return null;
    const { batting, bowling } = side(inn, index);
    return {
      battingTeam: batting, bowlingTeam: bowling, totalRuns: inn.runs, totalWickets: inn.wickets, overs: inn.overs,
      runRate: runRate(inn.runs, inn.balls), isCompleted: index === 0 ? innings.length >= 2 : !!m.matchEnded,
      extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 }, batsmen: [], bowlers: [], fallOfWickets: [], partnerships: [],
    };
  };

  const info = m.teamInfo ?? [];
  return {
    source: SOURCE, matchId: m.id, matchName: m.name ?? teams.join(" vs "), matchType: m.matchType ?? "",
    score, status, overs: latest?.overs ?? "0", isLive, matchStarted: !!m.matchStarted, matchEnded: !!m.matchEnded,
    teams: teams.map((t) => ({ name: t, shortName: shortName(t), img: info.find((i) => i.name === t)?.img })),
    scores: innings.map(({ runs, wickets, overs, inning }) => ({ runs, wickets, overs, inning })),
    recentBalls: [], currentBatsmen: [], currentBowler: null, nextBatsman: null, tossWinner: "",
    tossDecision: status.toLowerCase().includes("opt to") ? status : "",
    target: innings.length >= 2 && first ? first.runs + 1 : null, currentInnings: innings.length,
    lastUpdated: fetchedAt, innings1: inningsData(innings[0], 0), innings2: inningsData(innings[1], 1),
    commentary: [], totalCommentaryCount: 0, matchResult: m.matchEnded ? status : null,
    venue: m.venue ?? "", date: m.date ?? "", seriesId: m.series_id ?? "",
  };
}

const isIpl = (m: ApiMatch) =>
  m.series_id === IPL_SERIES_ID || /indian premier league|\bipl\b/i.test(m.name ?? "");

export async function GET() {
  const apiKey = process.env.CRICKET_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, error: "Live scores aren’t configured: CRICKET_API_KEY is missing." }, { status: 500 });
  }

  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return NextResponse.json({ success: true, data: cache.payload, cached: true });
  }

  try {
    const res = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${encodeURIComponent(apiKey)}&offset=0`, { cache: "no-store" });
    if (!res.ok) throw new Error(`CricketData.org returned ${res.status}`);
    const json = await res.json();
    if (json.status !== "success" || !Array.isArray(json.data)) throw new Error("Unexpected response from CricketData.org");

    const fetchedAt = new Date().toISOString();
    const live = (json.data as ApiMatch[]).filter((m) => isIpl(m) && m.matchStarted && !m.matchEnded).map((m) => buildMatch(m, fetchedAt));
    const payload = {
      primary: live[0] ?? null,
      iplMatches: live,
      allMatches: [],
      source: SOURCE,
      fetchedAt,
      apiInfo: { hitsToday: json.info?.hitsToday, hitsLimit: json.info?.hitsLimit, hitsUsed: json.info?.hitsUsed },
    };
    cache = { at: now, payload };
    return NextResponse.json({ success: true, data: payload });
  } catch (error) {
    console.error("Live score API error:", error);
    if (cache) return NextResponse.json({ success: true, data: { ...cache.payload, stale: true }, stale: true });
    return NextResponse.json({ success: false, error: "Live scores are unavailable right now." }, { status: 503 });
  }
}
