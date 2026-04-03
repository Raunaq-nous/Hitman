"use client";

import { useState, useEffect, useRef } from "react";
import { Radio, RefreshCw, Maximize2 } from "lucide-react";

type LiveData = {
  source: string;
  status: string;
  score: string;
  overs: string;
  recentBalls: string[];
  currentBatsmen: { name: string; runs: number; balls: number; isOnStrike: boolean }[];
  currentBowler: { name: string; overs: string; wickets: number; runs: number; economy: number } | null;
  nextBatsman: string | null;
  lastUpdated: string;
};

export default function LiveScoreWidget({ matchId, onExpand }: { matchId: string; onExpand?: () => void }) {
  const [data, setData] = useState<LiveData | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLive = async () => {
    try {
      const res = await fetch(`/api/live-score?matchId=${matchId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (e) {
      console.error("Live score error:", e);
    }
  };

  useEffect(() => {
    fetchLive();
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchLive, 10000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh]);

  const ballColor = (ball: string) => {
    if (ball === "W") return "bg-red-600 text-white";
    if (ball === "4") return "bg-blue-500 text-white";
    if (ball === "6") return "bg-green-500 text-white";
    if (ball === "0") return "bg-gray-800 text-gray-500";
    if (ball === "Wd" || ball === "Nb") return "bg-yellow-600/80 text-black";
    return "bg-gray-700 text-white";
  };

  return (
    <div className="glass-panel rounded-sm overflow-hidden">
      <div className="bg-black/80 border-b border-white/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Radio size={14} className="text-red-500 animate-pulse" />
            <span className="text-red-500 text-xs font-mono font-bold tracking-widest">LIVE MATCH</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`text-[10px] font-mono px-2 py-1 rounded-sm border transition ${
                autoRefresh
                  ? "bg-green-500/10 text-green-500 border-green-500/30"
                  : "bg-gray-500/10 text-gray-500 border-white/10"
              }`}
            >
              {autoRefresh ? "● AUTO" : "○ PAUSED"}
            </button>
            <button onClick={fetchLive} className="text-gray-500 hover:text-white transition">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {data ? (
          <>
            <div className="text-white font-mono font-black text-xl tracking-wider mb-1">
              {data.score}
            </div>
            <div className="text-gray-400 font-mono text-xs tracking-widest mb-3">
              {data.status}
            </div>

            {/* Current batsmen */}
            {data.currentBatsmen && data.currentBatsmen.length > 0 && (
              <div className="flex items-center space-x-4 mb-3">
                {data.currentBatsmen.map((b, i) => (
                  <div key={i} className="flex items-center space-x-1.5">
                    {b.isOnStrike && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
                    <span className={`font-mono text-xs ${b.isOnStrike ? "text-white font-bold" : "text-gray-400"}`}>
                      {b.name.split(" ").pop()} {b.runs}({b.balls})
                    </span>
                  </div>
                ))}
                {data.currentBowler && (
                  <span className="font-mono text-xs text-gray-500">
                    | 🔴 {data.currentBowler.name.split(" ").pop()} {data.currentBowler.overs}-{data.currentBowler.wickets}-{data.currentBowler.runs}
                  </span>
                )}
              </div>
            )}

            {/* Recent balls */}
            {data.recentBalls.length > 0 && (
              <div className="flex items-center space-x-1.5">
                <span className="text-gray-600 text-[10px] font-mono mr-1">THIS OVER</span>
                {data.recentBalls.map((ball, i) => (
                  <div
                    key={i}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold font-mono ${ballColor(ball)}`}
                  >
                    {ball}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-gray-600 font-mono text-sm animate-pulse">
            Connecting to live feed...
          </div>
        )}

        {data && (
          <div className="mt-3 flex items-center justify-between text-[9px] text-gray-600 font-mono">
            <div className="flex items-center space-x-2">
              <span>Source: {data.source.toUpperCase()}</span>
              <span>·</span>
              <span>Updated: {new Date(data.lastUpdated).toLocaleTimeString("en-IN")}</span>
            </div>
            {onExpand && (
              <button onClick={onExpand} className="flex items-center space-x-1 text-red-500 hover:text-white transition">
                <Maximize2 size={10} />
                <span>FULL SCORECARD</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
