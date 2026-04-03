"use client";

import { useState } from "react";
import { Trophy, Radio, Wallet, Users2 } from "lucide-react";
import LiveMatchCenter from "@/components/LiveMatchCenter";
import TreasurerCard from "@/components/TreasurerCard";

type PlayerInfo = {
  id: string;
  playerId: string;
  player: {
    name: string;
    role: string;
    credits: number;
  };
};

type ExistingTeam = {
  id: string;
  captainId: string;
  viceCaptainId: string;
  totalPoints: number;
  players: PlayerInfo[];
};

type TabKey = "TEAM" | "LIVE" | "TREASURER";

export default function MatchContestTabs({
  matchId,
  team1,
  team2,
  existingTeam,
  leagueId,
  membersCount,
  captainId,
  viceCaptainId,
}: {
  matchId: string;
  team1: string;
  team2: string;
  existingTeam: ExistingTeam;
  leagueId: string;
  membersCount: number;
  captainId: string;
  viceCaptainId: string;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("LIVE");

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: "TEAM", label: "YOUR TEAM", icon: Users2 },
    { key: "LIVE", label: "LIVE MATCH", icon: Radio },
    { key: "TREASURER", label: "TREASURER", icon: Wallet },
  ];

  const roleEmoji = (role: string) => {
    switch (role) {
      case "BATSMAN": return "🏏";
      case "BOWLER": return "🔴";
      case "ALL_ROUNDER": return "⭐";
      case "WICKETKEEPER": return "🧤";
      default: return "•";
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-black/50 p-1 rounded-sm border border-white/5">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 px-3 font-mono text-xs tracking-widest font-bold rounded-sm transition flex items-center justify-center space-x-2 ${
              activeTab === tab.key
                ? "bg-red-600 text-white"
                : "text-gray-500 hover:text-white hover:bg-white/5"
            }`}
          >
            <tab.icon size={14} />
            <span>{tab.label}</span>
            {tab.key === "LIVE" && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* YOUR TEAM Tab */}
      {activeTab === "TEAM" && (
        <div className="glass-panel p-6 rounded-sm">
          <h3 className="text-lg font-bold text-white font-mono tracking-widest mb-4 flex items-center">
            <Trophy size={18} className="mr-2 text-yellow-500" />
            YOUR PLAYING XI
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {existingTeam.players.map(fp => (
              <div
                key={fp.id}
                className={`bg-black/50 border rounded-sm p-3 text-xs font-mono ${
                  fp.playerId === captainId
                    ? "border-red-500/50 bg-red-600/10"
                    : fp.playerId === viceCaptainId
                    ? "border-white/30 bg-white/5"
                    : "border-white/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span>{roleEmoji(fp.player.role)}</span>
                    <span className="text-gray-200 font-bold truncate max-w-[120px]">{fp.player.name}</span>
                  </div>
                  {fp.playerId === captainId && (
                    <span className="bg-red-600 text-white px-1.5 py-0.5 rounded-sm text-[9px] font-bold">C</span>
                  )}
                  {fp.playerId === viceCaptainId && (
                    <span className="bg-white text-black px-1.5 py-0.5 rounded-sm text-[9px] font-bold">VC</span>
                  )}
                </div>
                <div className="text-gray-600 text-[9px] mt-1">
                  {fp.player.role.replace("_", " ")} · {fp.player.credits} CR
                </div>
              </div>
            ))}
          </div>

          {existingTeam.totalPoints > 0 && (
            <div className="mt-6 text-center bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20 rounded-sm p-4">
              <span className="text-gray-400 font-mono text-xs tracking-widest">TOTAL POINTS</span>
              <div className="text-3xl font-black text-yellow-500 font-mono mt-1">{existingTeam.totalPoints}</div>
            </div>
          )}
        </div>
      )}

      {/* LIVE MATCH Tab */}
      {activeTab === "LIVE" && (
        <LiveMatchCenter />
      )}

      {/* TREASURER Tab */}
      {activeTab === "TREASURER" && (
        <TreasurerCard
          leagueName={`${team1} v ${team2}`}
          membersCount={membersCount}
          entryFee={100}
        />
      )}
    </div>
  );
}
