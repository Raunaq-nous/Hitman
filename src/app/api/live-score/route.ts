import { NextResponse } from "next/server";
import { env } from "@/providers/env";
import { namedCache } from "@/providers/cache";
import { log } from "@/providers/log";
import { tryParseOvers, runRate as legalRunRate } from "@/engine/legalBalls";
import { present } from "@/domain/sources/service";
import type { Sourced } from "@/domain/sources/types";

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
type Innings = { runs: number; wickets: number; overs: string; balls: number | null; inning: string };

// CricketData.org is a third-party aggregator without a licence for live use: VERIFIED_DELAYED, never "live".
const SOURCE_ID = "cricketdata";
const SOURCE_CLASS = "VERIFIED_DELAYED" as const;
type Payload = { primary: ReturnType<typeof buildMatch> | null; iplMatches: ReturnType<typeof buildMatch>[]; allMatches: never[]; source: string; fetchedAt: string; apiInfo: Record<string, unknown> };
// Keyed, bounded cache to protect the API quota (one key per feed query).
const cache = namedCache<Sourced<Payload>>("live-score", { ttlMs: CACHE_TTL_MS, maxEntries: 8 });
const CACHE_KEY = `currentMatches:${IPL_SERIES_ID}`;

const shortName = (team: string) => SHORT_NAMES[team] ?? team.split(" ").map((w) => w[0]).join("");

// Overs go through the legal-ball primitives ("10.4" = 64 balls). A malformed feed value gives null, not a guess.
const ballsFromOvers = (overs: string | number | undefined): number | null => tryParseOvers(overs ?? "0");

const runRate = (runs: number, balls: number | null): number | null => {
  const rr = balls === null ? null : legalRunRate(runs, balls);
  return rr === null ? null : Number(rr.toFixed(2));
};
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
      const ballsLeft = latest.balls === null ? 0 : perInnings - latest.balls;
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

const label = (s: Sourced<Payload>) => present(s, { now: Date.now(), context: "live", liveEnabled: env().LIVE_CALLS });

function respond(s: Sourced<Payload>) {
  const presentation = label(s);
  const withLabel = (m: ReturnType<typeof buildMatch>) => ({ ...m, dataLabel: presentation.label });
  const data = { ...s.value, primary: s.value.primary && withLabel(s.value.primary), iplMatches: s.value.iplMatches.map(withLabel), presentation };
  return NextResponse.json({ success: true, data, stale: presentation.state === "stale" });
}

export async function GET() {
  const apiKey = env().CRICKET_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, error: "Live scores aren’t configured: CRICKET_API_KEY is missing.", presentation: present(null, { now: Date.now(), context: "live", liveEnabled: false }) }, { status: 503 });
  }

  const fresh = cache.get(CACHE_KEY);
  if (fresh) return respond(fresh);

  try {
    const res = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${encodeURIComponent(apiKey)}&offset=0`, { cache: "no-store" });
    if (!res.ok) throw new Error(`CricketData.org returned ${res.status}`);
    const json = await res.json();
    if (json.status !== "success" || !Array.isArray(json.data)) throw new Error("Unexpected response from CricketData.org");

    const fetchedAt = new Date().toISOString();
    const live = (json.data as ApiMatch[]).filter((m) => isIpl(m) && m.matchStarted && !m.matchEnded).map((m) => buildMatch(m, fetchedAt));
    const payload: Payload = {
      primary: live[0] ?? null,
      iplMatches: live,
      allMatches: [],
      source: SOURCE,
      fetchedAt,
      apiInfo: { hitsToday: json.info?.hitsToday, hitsLimit: json.info?.hitsLimit, hitsUsed: json.info?.hitsUsed },
    };
    const sourced: Sourced<Payload> = { value: payload, sourceId: SOURCE_ID, sourceClass: SOURCE_CLASS, observedAt: fetchedAt };
    cache.set(CACHE_KEY, sourced);
    return respond(sourced);
  } catch (error) {
    log.error("live score fetch failed", { error: error instanceof Error ? error.message : String(error) });
    const stale = cache.peek(CACHE_KEY);
    if (stale) return respond(stale.value);
    return NextResponse.json({ success: false, error: "Live scores are unavailable right now." }, { status: 503 });
  }
}
