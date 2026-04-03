"use client";

import { IPL_2026_SCHEDULE, IPL_TEAMS } from "@/constants/iplData";

export default function SchedulePage() {
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-black text-white font-mono tracking-widest mb-3">TATA IPL 2026</h1>
        <p className="text-gray-500 font-mono uppercase tracking-widest text-xs">Full Season Schedule · 70 League Matches · March 28 – May 16</p>
      </div>

      <div className="space-y-3">
        {IPL_2026_SCHEDULE.map((m) => {
          const t1 = IPL_TEAMS.find(t => t.id === m.team1);
          const t2 = IPL_TEAMS.find(t => t.id === m.team2);
          const matchDate = new Date(m.date);
          const isPast = m.date < today;
          const isToday = m.date === today;

          return (
            <div key={m.match} className={`glass-panel rounded-sm flex flex-col sm:flex-row items-stretch sm:items-center overflow-hidden transition hover:border-white/20 ${isToday ? "border-red-500/50 bg-red-500/5" : ""} ${isPast ? "opacity-60" : ""}`}>

              {/* Match number + date */}
              <div className="sm:w-28 bg-black/60 flex flex-col items-center justify-center py-3 px-3 border-b sm:border-b-0 sm:border-r border-white/5 text-center font-mono shrink-0">
                <div className="text-red-500 font-bold tracking-widest text-[10px]">MATCH {m.match}</div>
                <div className="text-white font-bold text-sm">{matchDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</div>
              </div>

              {/* Teams */}
              <div className="flex-1 py-3 px-5 flex items-center justify-center sm:justify-start">
                <div className="flex items-center space-x-3">
                  {t1 && <img src={t1.logoUrl} alt={m.team1} className="w-7 h-7 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                  <span className="text-white font-black tracking-widest font-mono text-lg">{m.team1}</span>
                </div>
                <span className="text-red-500 font-bold mx-4 font-mono text-sm">VS</span>
                <div className="flex items-center space-x-3">
                  <span className="text-white font-black tracking-widest font-mono text-lg">{m.team2}</span>
                  {t2 && <img src={t2.logoUrl} alt={m.team2} className="w-7 h-7 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                </div>
              </div>

              {/* Venue */}
              <div className="py-3 px-4 text-gray-500 font-mono text-xs tracking-widest text-center sm:text-right border-t sm:border-t-0 sm:border-l border-white/5 shrink-0">
                <div>{m.venue.toUpperCase()}</div>
                {isToday && <div className="text-red-500 font-bold mt-1 animate-pulse">● TODAY</div>}
                {isPast && <div className="text-gray-600 mt-1">COMPLETED</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
