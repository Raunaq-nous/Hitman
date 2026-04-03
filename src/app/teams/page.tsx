"use client";

import { useEffect, useState } from "react";
import { IPL_TEAMS } from "@/constants/iplData";

type Player = { id: string; name: string; team: string; role: string; credits: number };

export default function TeamsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/players")
      .then(r => r.json())
      .then(d => { if (d.players) setPlayers(d.players); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-black text-white font-mono tracking-widest mb-3">TEAMS & COACHING STAFF</h1>
        <p className="text-gray-500 font-mono uppercase tracking-widest text-xs">IPL 2026 Official Rosters · All 10 Franchises</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {IPL_TEAMS.map(teamInfo => {
          const teamRoster = players.filter(p => p.team === teamInfo.id);

          return (
            <div key={teamInfo.id} className="glass-panel rounded-sm overflow-hidden flex flex-col">

              {/* Header with logo, name, coach */}
              <div className="bg-black/70 flex items-center p-5 border-b border-white/5">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center p-2 mr-5 shrink-0">
                  <img src={teamInfo.logoUrl} alt={teamInfo.id} className="w-full h-full object-contain" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-black text-white font-mono uppercase tracking-widest truncate">{teamInfo.name}</h2>
                  <div className="text-red-500 font-mono text-xs tracking-widest font-bold mt-1">
                    CAPTAIN: {teamInfo.captain.toUpperCase()}
                  </div>
                  <div className="text-gray-500 font-mono text-[10px] tracking-widest mt-1 flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 shadow-[0_0_4px_rgba(59,130,246,0.6)]"></span>
                    HEAD COACH: {teamInfo.coach.toUpperCase()}
                  </div>
                  <div className="text-gray-600 font-mono text-[10px] tracking-widest mt-0.5">
                    GROUP {teamInfo.group} · {teamInfo.venue.split(",")[0].toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Player roster */}
              <div className="p-5 bg-black/30 flex-1">
                <h4 className="text-gray-500 font-mono text-[10px] uppercase tracking-widest mb-3 pb-2 border-b border-white/5">
                  SQUAD ({teamRoster.length} players)
                </h4>
                {loading ? (
                  <p className="text-gray-600 font-mono text-xs py-4 text-center animate-pulse">Loading roster...</p>
                ) : teamRoster.length === 0 ? (
                  <p className="text-gray-600 font-mono text-xs py-4 text-center">No players seeded yet</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {teamRoster.map(p => (
                      <div key={p.id} className="flex items-center space-x-2 p-2 border border-white/5 bg-white/[0.02] rounded-sm hover:border-red-500/20 transition group">
                        <div className="w-7 h-7 rounded-full bg-gray-800 shrink-0 border border-white/10 flex items-center justify-center text-xs">
                          {p.role === "BATSMAN" ? "🏏" : p.role === "BOWLER" ? "🔴" : p.role === "ALL_ROUNDER" ? "⭐" : "🧤"}
                        </div>
                        <div className="min-w-0">
                          <div className="text-gray-300 font-mono text-[11px] truncate font-bold group-hover:text-white transition">{p.name}</div>
                          <div className="text-gray-600 font-mono text-[9px] uppercase tracking-widest">{p.role.replace("_", " ")} · {p.credits} CR</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
