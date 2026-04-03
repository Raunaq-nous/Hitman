"use client";

import LiveMatchCenter from "@/components/LiveMatchCenter";

export default function CommentaryPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#111] to-[#0a0a0a] py-20 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block px-4 py-1.5 rounded-sm border border-red-500/30 bg-red-500/10 mb-4">
            <span className="text-red-500 font-mono text-xs font-bold tracking-[0.3em] flex items-center space-x-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span>LIVE CRICKET SCORES</span>
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            MATCH <span className="text-red-500">CENTER</span>
          </h1>
          <p className="text-gray-500 font-mono text-sm mt-2 tracking-widest">
            Real-time scores from CricketData.org
          </p>
        </div>

        {/* Live Match Center */}
        <LiveMatchCenter />
      </div>
    </main>
  );
}
