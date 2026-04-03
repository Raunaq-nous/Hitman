"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserCheck, Star, Shield, ChevronRight } from "lucide-react";
import TreasurerCard from "@/components/TreasurerCard";

type Stat = { season: number; matches: number; runs: number; wickets: number; avg: number };
type Player = { id: string; name: string; team: string; role: string; credits: number; isPlaying: boolean; stats: Stat[]; subRole?: string };

// Sub-role classification helper
function getSubRole(player: Player): string {
  const name = player.name.toLowerCase();
  if (player.role === "BATSMAN") {
    // Known openers
    const openers = ["ruturaj gaikwad", "rohit sharma", "yashasvi jaiswal", "shubman gill",
      "travis head", "kl rahul", "shreyas iyer", "virat kohli", "aiden markram",
      "ajinkya rahane", "prabhsimran singh", "priyansh arya", "ayush mhatre", "finn allen"];
    if (openers.some(o => name.includes(o))) return "OPENER";
    return "MIDDLE ORDER";
  }
  if (player.role === "BOWLER") {
    const spinners = ["yuzvendra chahal", "rashid khan", "noor ahmad", "ravi bishnoi",
      "varun chakaravarthy", "kuldeep yadav", "shreyas gopal", "rahul chahar",
      "wanindu hasaranga", "m. siddharth", "manav suthar", "suyash sharma"];
    const paceFast = ["jasprit bumrah", "jofra archer", "pat cummins", "mitchell starc",
      "trent boult", "mohammad shami", "arshdeep singh", "josh hazlewood",
      "mohammed siraj", "kagiso rabada", "anrich nortje", "lockie ferguson",
      "matt henry", "marco jansen", "mayank yadav", "umran malik", "matheesha pathirana",
      "nathan ellis", "nandre burger", "kwena maphaka", "lungisani ngidi"];
    if (spinners.some(s => name.includes(s))) return "SPIN";
    if (paceFast.some(p => name.includes(p))) return "FAST PACE";
    return "MEDIUM PACE";
  }
  if (player.role === "ALL_ROUNDER") return "ALL ROUNDER";
  if (player.role === "WICKETKEEPER") return "WICKETKEEPER";
  return player.role;
}

type RoleFilter = "ALL" | "BATSMAN" | "BOWLER" | "ALL_ROUNDER" | "WICKETKEEPER";

const ROLE_REQUIREMENTS = {
  BATSMAN: { min: 3, max: 6, label: "BAT" },
  BOWLER: { min: 3, max: 6, label: "BOWL" },
  ALL_ROUNDER: { min: 1, max: 4, label: "AR" },
  WICKETKEEPER: { min: 1, max: 3, label: "WK" },
};

export default function TeamBuilderClient({
  players,
  matchId,
  leagueId,
  tossCompleted,
  membersCount,
  team1,
  team2
}: {
  players: Player[];
  matchId: string;
  leagueId: string;
  tossCompleted: boolean;
  membersCount: number;
  team1: string;
  team2: string;
}) {
  const router = useRouter();
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [viceCaptainId, setViceCaptainId] = useState<string | null>(null);
  const [step, setStep] = useState<"PAYMENT" | "SELECT" | "CAPTAIN">("PAYMENT");
  const [hasPaid, setHasPaid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");

  const MAX_CREDITS = 110;
  const currentCredits = selectedPlayers.reduce((sum, p) => sum + p.credits, 0);

  const roleCount: Record<string, number> = {
    BATSMAN: selectedPlayers.filter(p => p.role === "BATSMAN").length,
    BOWLER: selectedPlayers.filter(p => p.role === "BOWLER").length,
    ALL_ROUNDER: selectedPlayers.filter(p => p.role === "ALL_ROUNDER").length,
    WICKETKEEPER: selectedPlayers.filter(p => p.role === "WICKETKEEPER").length,
  };

  const togglePlayer = (player: Player) => {
    const isSelected = selectedPlayers.some(p => p.id === player.id);
    if (isSelected) {
      setSelectedPlayers(prev => prev.filter(p => p.id !== player.id));
      if (captainId === player.id) setCaptainId(null);
      if (viceCaptainId === player.id) setViceCaptainId(null);
    } else {
      if (selectedPlayers.length >= 11) return setError("MAX 11 PLAYERS");
      if (currentCredits + player.credits > MAX_CREDITS) return setError("NOT ENOUGH CREDITS");
      const req = ROLE_REQUIREMENTS[player.role as keyof typeof ROLE_REQUIREMENTS];
      if (req && roleCount[player.role] >= req.max) return setError(`MAX ${req.max} ${req.label} ALLOWED`);
      setError("");
      setSelectedPlayers(prev => [...prev, player]);
    }
  };

  const isRoleValid = () => {
    return (
      selectedPlayers.length === 11 &&
      roleCount.BATSMAN >= 3 &&
      roleCount.BOWLER >= 3 &&
      roleCount.ALL_ROUNDER >= 1 &&
      roleCount.WICKETKEEPER >= 1
    );
  };

  const handleNext = () => {
    if (selectedPlayers.length < 11) return setError("SELECT EXACTLY 11 PLAYERS");
    if (roleCount.BATSMAN < 3) return setError("NEED MIN 3 BATSMEN");
    if (roleCount.BOWLER < 3) return setError("NEED MIN 3 BOWLERS");
    if (roleCount.ALL_ROUNDER < 1) return setError("NEED MIN 1 ALL-ROUNDER");
    if (roleCount.WICKETKEEPER < 1) return setError("NEED MIN 1 WICKETKEEPER");
    setError("");
    setStep("CAPTAIN");
  };

  const handleSubmit = async () => {
    if (!captainId) return setError("SELECT A CAPTAIN (2x POINTS)");
    if (!viceCaptainId) return setError("SELECT A VICE-CAPTAIN (1.5x POINTS)");
    if (captainId === viceCaptainId) return setError("C AND VC MUST BE DIFFERENT");

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          playerIds: selectedPlayers.map(p => p.id),
          captainId,
          viceCaptainId
        })
      });

      if (res.ok) {
        router.push(`/leagues/${leagueId}`);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.message || "Failed to submit team.");
        setSubmitting(false);
      }
    } catch {
      setError("NETWORK ERROR");
      setSubmitting(false);
    }
  };

  // Filter players by role tab
  const filteredPlayers = roleFilter === "ALL"
    ? players
    : players.filter(p => p.role === roleFilter);

  // Sort: playing XI first, then by credits desc
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    if (tossCompleted) {
      if (a.isPlaying && !b.isPlaying) return -1;
      if (!a.isPlaying && b.isPlaying) return 1;
    }
    return b.credits - a.credits;
  });

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sidebar: Progress & Rules */}
      <div className="lg:col-span-1 space-y-4">
        {step !== "PAYMENT" && (
          <div className="glass-panel p-6 rounded-sm">
            <h2 className="text-lg font-bold mb-4 text-white font-mono uppercase tracking-widest">
              {step === "SELECT" ? "TEAM PROGRESS" : "ASSIGN CAPTAIN & VC"}
            </h2>

          {step === "SELECT" && (
            <>
              {/* Credit meter */}
              <div className="mb-5">
                <div className="flex justify-between text-sm font-mono mb-1.5">
                  <span className="text-gray-500">CREDITS LEFT</span>
                  <span className={`font-bold ${(MAX_CREDITS - currentCredits) < 15 ? "text-red-500" : "text-white"}`}>
                    {(MAX_CREDITS - currentCredits).toFixed(1)} / {MAX_CREDITS}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((MAX_CREDITS - currentCredits) / MAX_CREDITS) * 100}%` }}
                  />
                </div>
              </div>

              {/* Player count */}
              <div className="flex justify-between font-bold text-lg mb-5 font-mono border-b border-white/10 pb-4">
                <span className="text-gray-400">PLAYERS</span>
                <span className={selectedPlayers.length === 11 ? "text-green-500" : "text-white"}>
                  {selectedPlayers.length} / 11
                </span>
              </div>

              {/* Role requirements with progress bars */}
              <div className="space-y-3 font-mono">
                {Object.entries(ROLE_REQUIREMENTS).map(([role, req]) => {
                  const count = roleCount[role] || 0;
                  const isMet = count >= req.min;
                  const isMax = count >= req.max;
                  return (
                    <div key={role} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">
                          {roleEmoji(role)} {req.label} ({req.min}-{req.max})
                        </span>
                        <span className={`font-bold ${isMax ? "text-red-500" : isMet ? "text-green-500" : "text-gray-400"}`}>
                          {count}
                          {isMet && !isMax && " ✓"}
                          {isMax && " MAX"}
                        </span>
                      </div>
                      <div className="flex space-x-0.5">
                        {Array.from({ length: req.max }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition ${
                              i < count
                                ? i < req.min ? "bg-green-500" : "bg-blue-500"
                                : i < req.min ? "bg-red-500/30" : "bg-gray-800"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleNext}
                disabled={!isRoleValid()}
                className="mt-6 w-full neo-brutal bg-red-600 text-white font-bold py-3 rounded-sm disabled:bg-gray-700 disabled:text-gray-500 transition font-mono tracking-widest disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <span>CONTINUE TO CAPTAINS</span>
                <ChevronRight size={16} />
              </button>
            </>
          )}

          {step === "CAPTAIN" && (
            <>
              <div className="bg-red-500/10 border border-red-500/30 rounded-sm p-3 mb-4">
                <p className="text-red-400 text-xs font-mono leading-relaxed">
                  <strong>CAPTAIN (C)</strong> earns <strong>2× points</strong><br />
                  <strong>VICE-CAPTAIN (VC)</strong> earns <strong>1.5× points</strong>
                </p>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm font-mono">
                  <span className="text-gray-500">CAPTAIN</span>
                  <span className={captainId ? "text-green-500 font-bold" : "text-red-500"}>
                    {captainId ? selectedPlayers.find(p => p.id === captainId)?.name.toUpperCase() : "NOT SET"}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-mono">
                  <span className="text-gray-500">VICE-CAPTAIN</span>
                  <span className={viceCaptainId ? "text-green-500 font-bold" : "text-red-500"}>
                    {viceCaptainId ? selectedPlayers.find(p => p.id === viceCaptainId)?.name.toUpperCase() : "NOT SET"}
                  </span>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || !captainId || !viceCaptainId}
                className="w-full neo-brutal bg-white text-black font-bold py-3 rounded-sm disabled:bg-gray-700 disabled:text-gray-500 transition font-mono tracking-widest disabled:opacity-50"
              >
                {submitting ? "SUBMITTING..." : "✓ CONFIRM TEAM"}
              </button>

              <button
                onClick={() => setStep("SELECT")}
                className="mt-3 w-full text-xs text-red-500 font-bold font-mono tracking-widest hover:text-white transition py-2"
              >
                ← BACK TO ROSTER
              </button>
            </>
          )}

          {error && (
            <div className="mt-3 text-red-500 text-xs font-mono font-bold bg-red-500/10 border border-red-500/30 px-3 py-2 rounded-sm animate-pulse">
              ⚠ {error}
            </div>
          )}
          </div>
        )}

        {/* Selected players summary */}
        {selectedPlayers.length > 0 && step === "SELECT" && (
          <div className="glass-panel p-4 rounded-sm">
            <h4 className="text-xs text-gray-500 font-mono tracking-widest mb-3 uppercase">Your XI</h4>
            <div className="space-y-1.5">
              {selectedPlayers.map(p => (
                <div key={p.id} className="flex justify-between items-center text-xs font-mono">
                  <div className="flex items-center space-x-2">
                    <span>{roleEmoji(p.role)}</span>
                    <span className="text-gray-300 truncate max-w-[140px]">{p.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">{p.credits}</span>
                    <button
                      onClick={() => togglePlayer(p)}
                      className="text-red-500 hover:text-white transition text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="lg:col-span-2 glass-panel p-6 rounded-sm min-h-[600px]">
        {step === "PAYMENT" ? (
          <div className="text-center py-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold font-mono tracking-widest text-white mb-2">ENTRY FEE REQUIRED</h2>
              <p className="text-gray-400 font-mono text-sm max-w-lg mx-auto">
                To build your roster for this match, you must first secure your spot in the prize pool. Pay the ₹100 entry fee to unlock team builder.
              </p>
            </div>
            
            <div className="bg-black/40 border border-white/5 rounded-sm p-4 relative mb-6">
              <TreasurerCard leagueName={`${team1} vs ${team2}`} membersCount={membersCount} />
              {/* Invisible overlay button below the QR to click once paid */}
              <div className="mt-6 border-t border-white/10 pt-6">
                 <button 
                   onClick={() => { setHasPaid(true); setStep("SELECT"); }}
                   className="w-full neo-brutal bg-green-600 font-bold font-mono text-white py-4 rounded-sm tracking-widest hover:bg-green-500 transition shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                 >
                   ✓ I HAVE PAID THE ENTRY FEE
                 </button>
              </div>
            </div>
          </div>
        ) : step === "SELECT" ? (
          <>
            {/* Header with toss status */}
            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white font-mono tracking-widest">ROSTER</h3>
              {tossCompleted ? (
                <div className="text-xs bg-green-500/10 text-green-500 border border-green-500/30 px-3 py-1 rounded-sm font-bold font-mono tracking-widest">
                  ● TOSS DONE · PLAYING XI LIVE
                </div>
              ) : (
                <div className="text-xs bg-gray-500/10 text-gray-400 border border-white/10 px-3 py-1 rounded-sm font-mono tracking-widest">
                  AWAITING TOSS
                </div>
              )}
            </div>

            {/* Role filter tabs */}
            <div className="flex space-x-1 mb-4 bg-black/50 p-1 rounded-sm border border-white/5">
              {(["ALL", "BATSMAN", "BOWLER", "ALL_ROUNDER", "WICKETKEEPER"] as RoleFilter[]).map(role => {
                const label = role === "ALL" ? "ALL" : ROLE_REQUIREMENTS[role as keyof typeof ROLE_REQUIREMENTS]?.label || role;
                const count = role === "ALL" ? players.length : players.filter(p => p.role === role).length;
                const selected = role === "ALL" ? selectedPlayers.length : roleCount[role] || 0;
                return (
                  <button
                    key={role}
                    onClick={() => setRoleFilter(role)}
                    className={`flex-1 px-2 py-2 text-[10px] font-mono tracking-widest font-bold rounded-sm transition ${
                      roleFilter === role
                        ? "bg-red-600 text-white"
                        : "text-gray-500 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {label} ({selected}/{count})
                  </button>
                );
              })}
            </div>

            {/* Player list */}
            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
              {sortedPlayers.map(p => {
                const isSelected = selectedPlayers.some(sp => sp.id === p.id);
                const subRole = getSubRole(p);
                const avgPts = p.stats.length > 0
                  ? (p.stats.reduce((a, s) => a + s.avg, 0) / p.stats.length).toFixed(1)
                  : "0";

                return (
                  <div
                    key={p.id}
                    onClick={() => togglePlayer(p)}
                    className={`flex items-center justify-between p-3 rounded-sm border cursor-pointer transition ${
                      isSelected
                        ? "border-red-500 bg-red-600/10"
                        : tossCompleted && !p.isPlaying
                        ? "border-white/5 bg-black/30 opacity-50"
                        : "border-white/10 bg-black/50 hover:border-white/30"
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gray-800 shrink-0 border border-white/10 flex items-center justify-center text-sm">
                        {roleEmoji(p.role)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white flex items-center space-x-2 font-mono text-sm">
                          <span className="truncate">{p.name.toUpperCase()}</span>
                          {tossCompleted && (
                            p.isPlaying
                              ? <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.8)] shrink-0" title="Playing XI" />
                              : <span className="w-2 h-2 rounded-full bg-red-500/60 shrink-0" title="Benched" />
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="text-[10px] text-gray-500 font-mono">{p.team}</span>
                          <span className="text-[10px] text-gray-700">·</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-mono font-bold tracking-wider ${
                            subRole === "OPENER" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                            subRole === "FAST PACE" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                            subRole === "SPIN" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                            subRole === "MEDIUM PACE" ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                            subRole === "MIDDLE ORDER" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" :
                            "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                          }`}>
                            {subRole}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 shrink-0">
                      <div className="text-right">
                        <div className="text-white font-bold font-mono text-sm">{p.credits} CR</div>
                        <div className="text-red-500 text-[9px] font-mono font-bold">{avgPts} AVG</div>
                      </div>
                      <div className={`w-8 h-8 rounded-sm border flex items-center justify-center transition ${
                        isSelected
                          ? "bg-red-500/20 border-red-500/50 text-red-500"
                          : "bg-white/5 border-white/20 text-gray-500 hover:text-white"
                      }`}>
                        {isSelected ? <UserCheck size={16} /> : <UserPlus size={16} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* Captain Selection */}
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white font-mono tracking-widest">SELECT CAPTAIN & VICE-CAPTAIN</h3>
            </div>

            <div className="bg-gray-900/50 border border-white/5 rounded-sm p-3 mb-5">
              <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                <div className="flex items-center space-x-3">
                  <span className="w-6 h-6 bg-red-600 text-white rounded-sm flex items-center justify-center font-bold text-[10px]">C</span>
                  <span>Captain = <strong className="text-white">2× Points</strong></span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="w-6 h-6 bg-white text-black rounded-sm flex items-center justify-center font-bold text-[10px]">VC</span>
                  <span>Vice-Captain = <strong className="text-white">1.5× Points</strong></span>
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
              {selectedPlayers.map(p => {
                const isCaptain = captainId === p.id;
                const isVC = viceCaptainId === p.id;
                const subRole = getSubRole(p);

                return (
                  <div key={p.id} className={`flex items-center justify-between p-3 rounded-sm border transition ${
                    isCaptain ? "border-red-500 bg-red-500/10" :
                    isVC ? "border-white/40 bg-white/5" :
                    "border-white/10 bg-black/50"
                  }`}>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center text-sm">
                        {roleEmoji(p.role)}
                      </div>
                      <div>
                        <div className="font-bold text-white font-mono text-sm">{p.name.toUpperCase()}</div>
                        <div className="text-[10px] text-gray-500 font-mono flex items-center space-x-2">
                          <span>{p.team}</span>
                          <span className="text-gray-700">·</span>
                          <span>{subRole}</span>
                          <span className="text-gray-700">·</span>
                          <span>{p.credits} CR</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          if (viceCaptainId === p.id) setViceCaptainId(null);
                          setCaptainId(prev => prev === p.id ? null : p.id);
                        }}
                        className={`w-10 h-10 rounded-sm font-bold font-mono text-xs flex items-center justify-center border transition ${
                          isCaptain
                            ? "bg-red-600 border-red-400 text-white shadow-[0_0_12px_rgba(220,38,38,0.6)]"
                            : "bg-white/5 border-white/20 text-gray-500 hover:border-red-500/50 hover:text-white"
                        }`}
                      >
                        C
                      </button>
                      <button
                        onClick={() => {
                          if (captainId === p.id) setCaptainId(null);
                          setViceCaptainId(prev => prev === p.id ? null : p.id);
                        }}
                        className={`w-10 h-10 rounded-sm font-bold font-mono text-xs flex items-center justify-center border transition ${
                          isVC
                            ? "bg-white border-gray-300 text-black shadow-[0_0_12px_rgba(255,255,255,0.4)]"
                            : "bg-white/5 border-white/20 text-gray-500 hover:border-white/50 hover:text-white"
                        }`}
                      >
                        VC
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
