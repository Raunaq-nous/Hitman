"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, Trophy, List, Users, Loader2, RefreshCw, Radio } from "lucide-react";
import LiveMatchCenter from "@/components/LiveMatchCenter";

export default function LeagueTabsClient({
  league,
  matches,
}: {
  league: any,
  matches: any[],
}) {
  const [activeTab, setActiveTab] = useState<"LOBBY" | "LIVE" | "SCHEDULE" | "POINTS">("LOBBY");
  const [teamPoints, setTeamPoints] = useState<any[]>([]);
  const [isScraping, setIsScraping] = useState(false);

  // Find live match for the LIVE tab
  const liveMatch = matches.find(m => m.status === "IN_PROGRESS");

  useEffect(() => {
    if (activeTab === "POINTS" && teamPoints.length === 0) {
      triggerScraper();
    }
  }, [activeTab]);

  const triggerScraper = async () => {
    setIsScraping(true);
    try {
      const res = await fetch("/api/scraper/points");
      const json = await res.json();
      if (json.success) {
        setTeamPoints(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">

        {/* Tab Controls */}
        <div className="flex space-x-1 border-b border-white/10 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("LOBBY")}
            className={`px-4 py-2 font-mono text-sm tracking-widest transition whitespace-nowrap ${activeTab === "LOBBY" ? "border-b-2 border-red-500 text-red-500" : "text-gray-500 hover:text-white"}`}
          >
            LOBBY
          </button>
          <button
            onClick={() => setActiveTab("LIVE")}
            className={`px-4 py-2 font-mono text-sm tracking-widest transition flex items-center space-x-1.5 whitespace-nowrap ${activeTab === "LIVE" ? "border-b-2 border-red-500 text-red-500" : "text-gray-500 hover:text-white"}`}
          >
            <Radio size={10} className={liveMatch ? "animate-pulse text-red-500" : ""} />
            <span>LIVE</span>
          </button>
          <button
            onClick={() => setActiveTab("SCHEDULE")}
            className={`px-4 py-2 font-mono text-sm tracking-widest transition whitespace-nowrap ${activeTab === "SCHEDULE" ? "border-b-2 border-red-500 text-red-500" : "text-gray-500 hover:text-white"}`}
          >
            SCHEDULE
          </button>
          <button
            onClick={() => setActiveTab("POINTS")}
            className={`px-4 py-2 font-mono text-sm tracking-widest transition whitespace-nowrap ${activeTab === "POINTS" ? "border-b-2 border-red-500 text-red-500" : "text-gray-500 hover:text-white"}`}
          >
            POINTS
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "LOBBY" && (
          <div className="space-y-4">
            {matches.length === 0 ? (
              <div className="glass-panel p-6 rounded-sm flex flex-col items-center">
                <p className="text-gray-500 mb-4 font-mono select-none">NO UPCOMING MATCHES</p>
              </div>
            ) : (
              matches.map((match) => (
                <div key={match.id} className={`glass-panel p-6 rounded-sm hover:-translate-y-1 hover:border-red-500 transition group ${match.status === "IN_PROGRESS" ? "border-red-500/50 bg-red-500/5" : ""}`}>
                  <div className="flex flex-col sm:flex-row justify-between items-center">
                    <div className="flex items-center space-x-6 w-full sm:w-auto">
                      <div className="text-2xl font-black text-white font-mono">{match.team1}</div>
                      <div className="text-red-500 font-mono font-bold tracking-widest text-xs">VS</div>
                      <div className="text-2xl font-black text-white font-mono">{match.team2}</div>
                      {match.status === "IN_PROGRESS" && (
                        <span className="flex items-center space-x-1.5 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-sm">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                          <span className="text-red-500 text-[10px] font-mono font-bold tracking-widest">LIVE</span>
                        </span>
                      )}
                    </div>

                    <div className="mt-4 sm:mt-0 flex flex-col sm:items-end w-full sm:w-auto">
                      <div className="text-xs text-gray-500 mb-3 font-mono tracking-widest">
                        {new Date(match.date).toLocaleString()}
                      </div>
                      <Link
                        href={`/leagues/${league.id}/match/${match.id}`}
                        className={`neo-brutal px-6 py-2 rounded-sm font-bold font-mono transition text-center text-sm ${match.status === "IN_PROGRESS" ? "bg-red-600 text-white hover:bg-red-500" : "bg-red-600 text-black hover:bg-red-500"}`}
                      >
                        {match.status === "IN_PROGRESS" ? "⚡ ENTER LIVE MATCH" : "JOIN CONTEST"}
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* LIVE COMMENTARY TAB */}
        {activeTab === "LIVE" && (
          <div>
            {liveMatch ? (
              <LiveMatchCenter compact={true} />
            ) : matches.length > 0 ? (
              <div className="space-y-4">
                <div className="glass-panel p-6 rounded-sm text-center">
                  <Radio size={24} className="text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 font-mono text-sm mb-2">No match is currently live</p>
                  <p className="text-gray-600 font-mono text-xs">Showing commentary for the next scheduled match</p>
                </div>
                <LiveMatchCenter compact={true} />
              </div>
            ) : (
              <div className="glass-panel p-12 rounded-sm text-center">
                <p className="text-gray-500 font-mono">No matches available for commentary</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "SCHEDULE" && (
          <div className="glass-panel p-6 rounded-sm">
            <h3 className="text-lg font-bold text-white mb-4 font-mono flex items-center">
              <Calendar className="mr-2 text-red-500" size={18} />
              IPL 2026 LIVE SCHEDULE
            </h3>
            <p className="text-gray-500 text-xs font-mono mb-4">Tracking sync updates...</p>
            <div className="space-y-2">
              {matches.map((m) => (
                <div key={"sched_"+m.id} className="flex justify-between border-b border-white/5 py-3">
                  <div className="font-mono text-sm text-gray-300"><span className="text-white font-bold">{m.team1}</span> vs <span className="text-white font-bold">{m.team2}</span></div>
                  <div className="font-mono text-xs text-gray-500">{new Date(m.date).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "POINTS" && (
          <div className="glass-panel p-6 rounded-sm overflow-x-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white font-mono flex items-center tracking-widest">
                <List className="mr-2 text-red-500" size={18} />
                LIVE LEADERBOARD
              </h3>
              <button
                onClick={triggerScraper}
                disabled={isScraping}
                className="flex items-center space-x-2 text-xs bg-black text-red-500 border border-red-500/30 px-3 py-1 rounded-sm font-mono hover:bg-red-600/10 transition"
              >
                {isScraping ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                <span>RESYNC ENGINE</span>
              </button>
            </div>

            <table className="w-full text-left font-mono text-sm">
              <thead className="text-gray-500 border-b border-white/10 uppercase text-xs">
                <tr>
                  <th className="py-3">Team</th>
                  <th className="py-3 text-center">Played</th>
                  <th className="py-3 text-center">Points</th>
                  <th className="py-3 text-right">NRR</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {isScraping ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-500 font-mono tracking-widest animate-pulse">Running Background Scraper...</td>
                  </tr>
                ) : teamPoints.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-600 font-mono tracking-widest">Data Unavailable</td>
                  </tr>
                ) : (
                  teamPoints.map((t, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="py-3 font-bold text-white flex items-center space-x-3">
                        <span className="text-gray-600 font-normal w-4">{t.rank}</span>
                        <span>{t.team.toUpperCase()}</span>
                      </td>
                      <td className="py-3 text-center">{t.played}</td>
                      <td className="py-3 text-center text-red-500 font-bold">{t.points}</td>
                      <td className="py-3 text-right text-green-500">{t.nrr}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="lg:col-span-1">
        <div className="glass-panel rounded-sm p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center font-mono">
            <Users className="mr-2 text-white" size={18} />
            MEMBERS ({league.members.length})
          </h3>
          <ul className="space-y-4">
            {league.members.map((m: any) => (
              <li key={m.id} className="flex items-center space-x-3 bg-black/50 p-3 rounded-sm border border-white/10">
                <div className="h-10 w-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-red-500 font-bold font-mono">
                  {m.user.name[0]}
                </div>
                <div>
                  <p className="font-bold text-white font-mono text-sm leading-none">{m.user.name.toUpperCase()}</p>
                  <p className="text-xs text-gray-500 font-mono mt-1 tracking-widest border-t border-white/10 pt-1">XP: {m.user.xp}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
