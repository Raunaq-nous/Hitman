"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { IPL_TEAMS } from "@/constants/iplData";

export default function LeaderboardPage() {
  const [teamPoints, setTeamPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/scraper/points");
      const json = await res.json();
      if (json.success) setTeamPoints(json.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-black text-white font-mono tracking-widest mb-3">IPL 2026 STANDINGS</h1>
        <p className="text-gray-500 font-mono uppercase tracking-widest text-xs">Live Points Table · Updated April 3, 2026</p>
      </div>

      <div className="glass-panel p-6 md:p-8 rounded-sm overflow-x-auto">
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
          <h3 className="text-sm font-bold text-gray-400 font-mono tracking-widest uppercase">Points Table</h3>
          <button onClick={fetchData} disabled={loading}
            className="flex items-center space-x-2 text-xs bg-red-600/10 text-red-500 border border-red-500/20 px-3 py-1.5 rounded-sm font-mono hover:bg-red-500/20 transition">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            <span>REFRESH</span>
          </button>
        </div>

        <table className="w-full text-left font-mono text-sm">
          <thead className="text-gray-600 border-b border-white/5 uppercase text-xs">
            <tr>
              <th className="py-3 pl-2 w-8">#</th>
              <th className="py-3">Team</th>
              <th className="py-3 text-center">P</th>
              <th className="py-3 text-center">W</th>
              <th className="py-3 text-center">L</th>
              <th className="py-3 text-center">PTS</th>
              <th className="py-3 text-right pr-2">NRR</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            {loading ? (
              <tr><td colSpan={7} className="py-16 text-center text-gray-600 font-mono tracking-widest animate-pulse">Loading...</td></tr>
            ) : teamPoints.length === 0 ? (
              <tr><td colSpan={7} className="py-16 text-center text-gray-600 font-mono">No data available</td></tr>
            ) : (
              teamPoints.map((t, i) => {
                const info = IPL_TEAMS.find(td => td.shortName === t.shortName || td.name === t.team);
                const isQualifying = i < 4;
                return (
                  <tr key={i} className={`border-b border-white/5 hover:bg-white/5 transition ${isQualifying ? "bg-green-500/5" : ""}`}>
                    <td className="py-3.5 pl-2 text-gray-600 font-bold">{t.rank}</td>
                    <td className="py-3.5">
                      <div className="flex items-center space-x-3">
                        {info && (
                          <img src={info.logoUrl} alt={t.shortName} className="w-7 h-7 object-contain" 
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        )}
                        <div>
                          <div className="text-white font-bold text-sm">{t.team}</div>
                          <div className="text-gray-600 text-xs">{info?.venue?.split(",")[0] || ""}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 text-center text-gray-400">{t.played}</td>
                    <td className="py-3.5 text-center text-green-500">{t.wins}</td>
                    <td className="py-3.5 text-center text-red-500">{t.losses}</td>
                    <td className="py-3.5 text-center text-white font-black text-lg">{t.points}</td>
                    <td className={`py-3.5 text-right pr-2 ${parseFloat(t.nrr) >= 0 ? "text-green-500" : "text-red-400"}`}>{t.nrr}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div className="mt-4 text-xs text-gray-600 font-mono flex items-center space-x-2">
          <span className="w-2 h-2 bg-green-500/30 rounded-sm inline-block"></span>
          <span>Top 4 qualify for playoffs</span>
        </div>
      </div>
    </div>
  );
}
