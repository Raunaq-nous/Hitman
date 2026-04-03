"use client";

import { useState, useEffect, useRef } from "react";
import { Radio, RefreshCw, Zap, BarChart3, Users2, Info, Trophy, Clock, MapPin, Wifi, WifiOff } from "lucide-react";

type ScoreEntry = {
  runs: number; wickets: number; overs: string; inning: string;
};
type TeamData = {
  name: string; shortName: string; img?: string;
};
type InningsData = {
  battingTeam: string; bowlingTeam: string; totalRuns: number; totalWickets: number;
  overs: string; runRate: number; isCompleted: boolean;
  extras: { wides: number; noBalls: number; byes: number; legByes: number; total: number; };
  batsmen: any[]; bowlers: any[]; fallOfWickets: any[]; partnerships: any[];
};
type MatchData = {
  source: string; matchId: string; matchName: string; matchType: string;
  score: string; status: string; overs: string; isLive: boolean;
  matchStarted: boolean; matchEnded: boolean;
  teams: TeamData[]; scores: ScoreEntry[];
  target: number | null; currentInnings: number;
  lastUpdated: string; innings1: InningsData | null; innings2: InningsData | null;
  matchResult: string | null; venue: string; date: string;
  tossDecision: string;
};
type APIResponse = {
  primary: MatchData | null;
  iplMatches: MatchData[];
  allMatches: any[];
  apiInfo: { hitsToday: number; hitsLimit: number; hitsUsed: number; };
};

type TabKey = "LIVE" | "SCORECARD" | "MATCHES" | "INFO";

export default function LiveMatchCenter({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<APIResponse | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("LIVE");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatchIdx, setSelectedMatchIdx] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLive = async () => {
    try {
      setError(null);
      const res = await fetch("/api/live-score");
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.error || "Failed to fetch");
      }
    } catch (e) {
      setError("Network error — retrying...");
      console.error("Live score error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLive();
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchLive, 30000); // Every 30 seconds
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh]);

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: "LIVE", label: "LIVE SCORE", icon: Zap },
    { key: "SCORECARD", label: "SCORECARD", icon: BarChart3 },
    { key: "MATCHES", label: "ALL MATCHES", icon: Users2 },
    { key: "INFO", label: "INFO", icon: Info },
  ];

  if (loading) {
    return (
      <div className="glass-panel rounded-sm p-8 text-center">
        <div className="flex items-center justify-center space-x-3">
          <Radio size={16} className="text-red-500 animate-pulse" />
          <span className="text-gray-400 font-mono text-sm animate-pulse tracking-widest">
            CONNECTING TO LIVE FEED...
          </span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="glass-panel rounded-sm p-8 text-center">
        <WifiOff size={24} className="text-red-500 mx-auto mb-3" />
        <p className="text-red-400 font-mono text-sm">{error}</p>
        <button onClick={fetchLive} className="mt-3 text-xs text-white font-mono bg-red-600 px-4 py-2 rounded-sm">
          RETRY
        </button>
      </div>
    );
  }

  if (!data?.primary) return null;

  const match = data.iplMatches[selectedMatchIdx] || data.primary;

  return (
    <div className="glass-panel rounded-sm overflow-hidden">
      {/* === SCORE HEADER === */}
      <div className="bg-black/90 border-b border-white/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {match.isLive ? (
              <>
                <Radio size={12} className="text-red-500 animate-pulse" />
                <span className="text-red-500 text-[10px] font-mono font-bold tracking-[0.3em]">LIVE</span>
              </>
            ) : match.matchEnded ? (
              <>
                <Trophy size={12} className="text-green-500" />
                <span className="text-green-500 text-[10px] font-mono font-bold tracking-[0.3em]">RESULT</span>
              </>
            ) : (
              <>
                <Clock size={12} className="text-yellow-500" />
                <span className="text-yellow-500 text-[10px] font-mono font-bold tracking-[0.3em]">UPCOMING</span>
              </>
            )}
            <span className="text-gray-600 text-[9px] font-mono ml-2">
              {match.source}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`text-[9px] font-mono px-2 py-0.5 rounded-sm border transition ${
                autoRefresh
                  ? "bg-green-500/10 text-green-500 border-green-500/30"
                  : "bg-gray-500/10 text-gray-500 border-white/10"
              }`}
            >
              {autoRefresh ? "● AUTO" : "○ PAUSED"}
            </button>
            <button onClick={fetchLive} className="text-gray-500 hover:text-white transition">
              <RefreshCw size={12} />
            </button>
          </div>
        </div>

        {/* Match Name */}
        <div className="text-[10px] text-gray-500 font-mono tracking-widest mb-2">
          {match.matchName}
        </div>

        {/* Score Display */}
        {match.scores.map((s, i) => (
          <div key={i} className="flex items-baseline space-x-3 mb-1">
            <span className={`font-mono text-xs tracking-widest ${i === match.scores.length - 1 && match.isLive ? "text-white font-bold" : "text-gray-400"}`}>
              {s.inning.split(" Inning")[0].replace(/,.*/, "").toUpperCase()}
            </span>
            <span className={`font-mono font-black tracking-wider ${
              i === match.scores.length - 1 && match.isLive ? "text-white text-xl" : "text-gray-300 text-lg"
            }`}>
              {s.runs}/{s.wickets}
            </span>
            <span className="text-gray-500 font-mono text-xs">
              ({s.overs} ov)
            </span>
          </div>
        ))}

        {/* Status */}
        <div className={`font-mono text-xs tracking-widest mt-2 ${
          match.matchEnded ? "text-green-400 font-bold" : "text-yellow-500"
        }`}>
          {match.status}
        </div>

        {/* Target info */}
        {match.target && match.isLive && (
          <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded-sm px-3 py-1.5 inline-block">
            <span className="text-red-400 font-mono text-xs font-bold">
              TARGET: {match.target}
            </span>
          </div>
        )}
      </div>

      {/* === IPL MATCH SELECTOR (if multiple IPL matches) === */}
      {data.iplMatches.length > 1 && (
        <div className="flex gap-1 p-2 bg-black/60 border-b border-white/5 overflow-x-auto">
          {data.iplMatches.map((m, i) => (
            <button
              key={m.matchId}
              onClick={() => setSelectedMatchIdx(i)}
              className={`shrink-0 px-3 py-1.5 rounded-sm font-mono text-[10px] tracking-wider border transition ${
                i === selectedMatchIdx
                  ? "bg-red-600/20 border-red-500/50 text-red-400 font-bold"
                  : "bg-black/50 border-white/10 text-gray-500 hover:text-white"
              }`}
            >
              {m.teams.map(t => t.shortName).join(" vs ")}
              {m.isLive && " 🔴"}
            </button>
          ))}
        </div>
      )}

      {/* === TAB NAVIGATION === */}
      <div className="flex border-b border-white/5 bg-black/60">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 px-2 font-mono text-[10px] tracking-widest font-bold transition flex items-center justify-center space-x-1.5 ${
              activeTab === tab.key
                ? "text-red-500 border-b-2 border-red-500 bg-red-500/5"
                : "text-gray-500 hover:text-white hover:bg-white/5"
            }`}
          >
            <tab.icon size={12} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* === TAB CONTENT === */}
      <div className="p-4">
        {/* LIVE SCORE TAB */}
        {activeTab === "LIVE" && (
          <div className="space-y-4">
            {/* Per-innings breakdown */}
            {match.scores.map((s, i) => {
              const teamName = s.inning.split(" Inning")[0].replace(/,.*/, "");
              return (
                <div key={i} className={`bg-black/50 border rounded-sm p-4 ${
                  i === match.scores.length - 1 && match.isLive
                    ? "border-red-500/30"
                    : "border-white/10"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-mono font-bold text-sm tracking-widest uppercase">
                      {teamName}
                    </h4>
                    {i === match.scores.length - 1 && match.isLive && (
                      <span className="text-[8px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-mono font-bold animate-pulse">
                        BATTING
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline space-x-4">
                    <span className="text-white font-mono font-black text-2xl">
                      {s.runs}/{s.wickets}
                    </span>
                    <span className="text-gray-500 font-mono text-sm">
                      ({s.overs} overs)
                    </span>
                    <span className="text-gray-400 font-mono text-xs">
                      RR: {(s.runs / Math.max(0.1, parseFloat(s.overs))).toFixed(2)}
                    </span>
                  </div>
                  {/* Run rate bar */}
                  <div className="mt-3 w-full bg-gray-800 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        s.runs / Math.max(0.1, parseFloat(s.overs)) > 10
                          ? "bg-red-500"
                          : s.runs / Math.max(0.1, parseFloat(s.overs)) > 7
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(100, (parseFloat(s.overs) / 20) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5 text-[9px] text-gray-600 font-mono">
                    <span>0 ov</span>
                    <span>10 ov</span>
                    <span>20 ov</span>
                  </div>
                </div>
              );
            })}

            {/* Match status card */}
            {match.status && (
              <div className={`rounded-sm p-4 border font-mono text-sm text-center ${
                match.matchEnded
                  ? "bg-green-500/10 border-green-500/30 text-green-400 font-bold"
                  : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
              }`}>
                {match.status}
              </div>
            )}

            {/* Refresh info */}
            <div className="text-center text-[9px] text-gray-700 font-mono">
              <Wifi size={10} className="inline mr-1" />
              Auto-refreshing every 30s · {data.apiInfo.hitsUsed || 0}/{data.apiInfo.hitsLimit || 100} API calls today
            </div>
          </div>
        )}

        {/* SCORECARD TAB */}
        {activeTab === "SCORECARD" && (
          <div className="space-y-6">
            {match.scores.length === 0 ? (
              <div className="text-center py-12 text-gray-500 font-mono text-sm">
                Match hasn&apos;t started yet. Scorecard will appear here once the match begins.
              </div>
            ) : (
              match.scores.map((s, i) => {
                const teamName = s.inning.split(" Inning")[0].replace(/,.*/, "");
                const rr = (s.runs / Math.max(0.1, parseFloat(s.overs))).toFixed(2);
                return (
                  <div key={i} className="bg-black/50 border border-white/10 rounded-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[10px] text-gray-400 font-mono tracking-[0.3em] uppercase">
                        🏏 {teamName} — INNINGS {i + 1}
                      </h4>
                    </div>
                    <div className="flex items-baseline space-x-4 mb-4">
                      <span className="text-white font-mono font-black text-xl">
                        {s.runs}/{s.wickets}
                      </span>
                      <span className="text-gray-500 font-mono text-xs">
                        ({s.overs} overs) · RR: {rr}
                      </span>
                    </div>

                    {/* Visual wickets remaining */}
                    <div className="flex items-center space-x-1 mb-3">
                      <span className="text-gray-600 text-[9px] font-mono mr-2">WKTS</span>
                      {Array.from({ length: 10 }).map((_, wi) => (
                        <div
                          key={wi}
                          className={`w-3 h-3 rounded-full transition ${
                            wi < s.wickets
                              ? "bg-red-500"
                              : "bg-gray-800 border border-gray-700"
                          }`}
                        />
                      ))}
                    </div>

                    {/* Overs progress */}
                    <div className="flex items-center space-x-1 mb-2">
                      <span className="text-gray-600 text-[9px] font-mono mr-2">OVERS</span>
                      {Array.from({ length: 20 }).map((_, oi) => (
                        <div
                          key={oi}
                          className={`flex-1 h-2 rounded-sm ${
                            oi < Math.floor(parseFloat(s.overs))
                              ? "bg-green-500/70"
                              : oi === Math.floor(parseFloat(s.overs))
                              ? "bg-yellow-500/70"
                              : "bg-gray-800"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ALL MATCHES TAB */}
        {activeTab === "MATCHES" && (
          <div className="space-y-3">
            <h4 className="text-[10px] text-gray-500 font-mono tracking-[0.3em] mb-3">
              IPL 2026 MATCHES
            </h4>
            {data.iplMatches.length > 0 ? (
              data.iplMatches.map((m, i) => (
                <button
                  key={m.matchId}
                  onClick={() => { setSelectedMatchIdx(i); setActiveTab("LIVE"); }}
                  className={`w-full text-left p-4 rounded-sm border transition ${
                    m.isLive
                      ? "border-red-500/30 bg-red-500/5 hover:bg-red-500/10"
                      : "border-white/10 bg-black/50 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {m.isLive && <Radio size={10} className="text-red-500 animate-pulse" />}
                      <span className="text-white font-mono text-sm font-bold">
                        {m.teams.map(t => t.shortName).join(" vs ")}
                      </span>
                    </div>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-sm ${
                      m.isLive
                        ? "bg-red-500/20 text-red-400"
                        : m.matchEnded
                        ? "bg-green-500/20 text-green-400"
                        : "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      {m.isLive ? "LIVE" : m.matchEnded ? "COMPLETED" : "UPCOMING"}
                    </span>
                  </div>
                  {m.scores.map((s, si) => (
                    <div key={si} className="text-gray-400 font-mono text-xs mb-0.5">
                      {s.inning.split(" Inning")[0].replace(/,.*/, "")}: {s.runs}/{s.wickets} ({s.overs} ov)
                    </div>
                  ))}
                  <div className="text-gray-500 font-mono text-[10px] mt-1">{m.status}</div>
                  <div className="text-gray-700 font-mono text-[9px] mt-1">
                    <MapPin size={8} className="inline mr-1" />{m.venue}
                  </div>
                </button>
              ))
            ) : (
              <div className="text-gray-500 font-mono text-sm text-center py-8">
                No IPL matches found in current data
              </div>
            )}

            {/* Other matches */}
            <h4 className="text-[10px] text-gray-500 font-mono tracking-[0.3em] mt-6 mb-3">
              OTHER LIVE MATCHES
            </h4>
            {data.allMatches.filter(m => !m.name?.includes("Indian Premier League")).slice(0, 5).map((m, i) => (
              <div key={i} className="p-3 rounded-sm border border-white/5 bg-black/30">
                <div className="flex items-center space-x-2 mb-1">
                  {m.isLive && <Radio size={8} className="text-red-500 animate-pulse" />}
                  <span className="text-gray-300 font-mono text-xs">{m.name}</span>
                </div>
                {m.score?.map((s: any, si: number) => (
                  <div key={si} className="text-gray-500 font-mono text-[10px]">
                    {s.inning?.split(" Inning")[0].replace(/,.*/, "")}: {s.runs}/{s.wickets} ({s.overs} ov)
                  </div>
                ))}
                <div className="text-gray-600 font-mono text-[9px] mt-1">{m.status}</div>
              </div>
            ))}
          </div>
        )}

        {/* INFO TAB */}
        {activeTab === "INFO" && (
          <div className="space-y-4">
            <div className="bg-black/50 border border-white/10 rounded-sm p-4 font-mono text-xs space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">MATCH</span>
                <span className="text-white font-bold text-right max-w-[60%]">{match.matchName}</span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-3">
                <span className="text-gray-500">VENUE</span>
                <span className="text-white text-right max-w-[60%]">{match.venue}</span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-3">
                <span className="text-gray-500">DATE</span>
                <span className="text-white">{new Date(match.date).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
              </div>
              {match.tossDecision && (
                <div className="flex justify-between border-t border-white/5 pt-3">
                  <span className="text-gray-500">TOSS</span>
                  <span className="text-white text-right max-w-[60%]">{match.tossDecision}</span>
                </div>
              )}
              {match.target && (
                <div className="flex justify-between border-t border-white/5 pt-3">
                  <span className="text-gray-500">TARGET</span>
                  <span className="text-red-500 font-bold">{match.target} runs</span>
                </div>
              )}
              <div className="flex justify-between border-t border-white/5 pt-3">
                <span className="text-gray-500">DATA SOURCE</span>
                <span className="text-green-400 font-bold">{match.source}</span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-3">
                <span className="text-gray-500">LAST UPDATED</span>
                <span className="text-gray-300">
                  {new Date(match.lastUpdated).toLocaleTimeString("en-IN")}
                </span>
              </div>
              {match.matchResult && (
                <div className="flex justify-between border-t border-white/5 pt-3">
                  <span className="text-gray-500">RESULT</span>
                  <span className="text-green-500 font-bold text-right max-w-[60%]">{match.matchResult}</span>
                </div>
              )}
            </div>

            {/* API Usage */}
            <div className="bg-black/50 border border-white/10 rounded-sm p-4 font-mono text-xs">
              <h4 className="text-gray-400 tracking-[0.3em] text-[10px] mb-3">API USAGE TODAY</h4>
              <div className="flex items-center space-x-3">
                <div className="flex-1 bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${((data.apiInfo.hitsUsed || 0) / (data.apiInfo.hitsLimit || 100)) * 100}%` }}
                  />
                </div>
                <span className="text-gray-400 whitespace-nowrap">
                  {data.apiInfo.hitsUsed || 0} / {data.apiInfo.hitsLimit || 100}
                </span>
              </div>
            </div>

            {/* All scores summary */}
            <div className="bg-black/50 border border-white/10 rounded-sm p-4 font-mono text-xs space-y-2">
              <h4 className="text-gray-400 tracking-[0.3em] text-[10px] mb-2">MATCH SUMMARY</h4>
              {match.scores.map((s, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-gray-400">{s.inning.split(" Inning")[0].replace(/,.*/, "")}</span>
                  <span className="text-white font-bold">
                    {s.runs}/{s.wickets} ({s.overs} ov)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-3 flex items-center justify-between text-[9px] text-gray-700 font-mono border-t border-white/5 pt-2">
        <span>HITMAN ENGINE v2.0 · REAL DATA</span>
        <span>Updated: {new Date(match.lastUpdated).toLocaleTimeString("en-IN")}</span>
      </div>
    </div>
  );
}
