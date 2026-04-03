"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserCheck, Star, Shield } from "lucide-react";

type Player = { id: string; name: string; team: string; role: string; credits: number };

export default function TeamBuilderClient({ 
  players, 
  matchId, 
  leagueId 
}: { 
  players: Player[]; 
  matchId: string;
  leagueId: string;
}) {
  const router = useRouter();
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [viceCaptainId, setViceCaptainId] = useState<string | null>(null);
  const [step, setStep] = useState<"SELECT" | "CAPTAIN">("SELECT");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const MAX_CREDITS = 100;
  const currentCredits = selectedPlayers.reduce((sum, p) => sum + p.credits, 0);

  // Role counters
  const roleCount = {
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
      if (selectedPlayers.length >= 11) return alert("You can only select 11 players.");
      if (currentCredits + player.credits > MAX_CREDITS) return alert("Not enough credits!");
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
    if (!isRoleValid()) {
      alert("Invalid team combination. Please fulfill role constraints.");
      return;
    }
    setStep("CAPTAIN");
  };

  const handleSubmit = async () => {
    if (!captainId || !viceCaptainId) {
      alert("Please select Captain and Vice-Captain.");
      return;
    }

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
    } catch (err) {
      setError("An unexpected error occurred.");
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sidebar: Progress & Rules */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-4">Team Progress</h2>
          <div className="flex justify-between font-bold text-lg mb-2">
            <span>Players</span>
            <span className={selectedPlayers.length === 11 ? "text-green-600" : ""}>{selectedPlayers.length} / 11</span>
          </div>
          <div className="flex justify-between font-bold text-lg mb-6">
            <span>Credits Left</span>
            <span className={MAX_CREDITS - currentCredits < 0 ? "text-red-600" : ""}>{(MAX_CREDITS - currentCredits).toFixed(1)}</span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Batsmen (Min 3)</span>
              <span className={`font-semibold ${roleCount.BATSMAN >= 3 ? "text-green-600" : "text-red-500"}`}>{roleCount.BATSMAN}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Bowlers (Min 3)</span>
              <span className={`font-semibold ${roleCount.BOWLER >= 3 ? "text-green-600" : "text-red-500"}`}>{roleCount.BOWLER}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">All-Rounders (Min 1)</span>
              <span className={`font-semibold ${roleCount.ALL_ROUNDER >= 1 ? "text-green-600" : "text-red-500"}`}>{roleCount.ALL_ROUNDER}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">WK (Min 1)</span>
              <span className={`font-semibold ${roleCount.WICKETKEEPER >= 1 ? "text-green-600" : "text-red-500"}`}>{roleCount.WICKETKEEPER}</span>
            </div>
          </div>

          {step === "SELECT" ? (
            <button
              onClick={handleNext}
              disabled={!isRoleValid()}
              className="mt-8 w-full bg-indigo-600 text-white font-bold py-3 rounded-xl disabled:bg-gray-300 transition"
            >
              Continue to Captains
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !captainId || !viceCaptainId}
              className="mt-8 w-full bg-yellow-400 text-indigo-900 font-bold py-3 rounded-xl disabled:bg-gray-200 transition"
            >
              {submitting ? "Submitting..." : "Submit Team"}
            </button>
          )}

          {error && <div className="mt-4 text-red-600 text-sm">{error}</div>}
        </div>
      </div>

      {/* Main Content: Player Roster */}
      <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[600px]">
        {step === "SELECT" ? (
          <>
            <h3 className="text-lg font-bold mb-4">Select Players</h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {players.map(p => {
                const isSelected = selectedPlayers.some(sp => sp.id === p.id);
                return (
                  <div key={p.id} className={`flex items-center justify-between p-4 rounded-xl border ${isSelected ? "border-indigo-600 bg-indigo-50" : "border-gray-200"}`}>
                    <div>
                      <div className="font-bold text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">
                        {p.team} • {p.role}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="font-semibold">{p.credits} Cr</span>
                      <button
                        onClick={() => togglePlayer(p)}
                        className={`p-2 rounded-full ${isSelected ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"}`}
                      >
                        {isSelected ? <UserCheck size={20} /> : <UserPlus size={20} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Choose C and VC</h3>
              <button onClick={() => setStep("SELECT")} className="text-sm text-indigo-600 font-semibold hover:underline">
                Back to Selection
              </button>
            </div>
            
            <div className="space-y-4">
              {selectedPlayers.map(p => (
                <div key={p.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-indigo-200">
                  <div>
                    <div className="font-bold text-gray-900">{p.name}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">{p.role}</div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        if (viceCaptainId === p.id) setViceCaptainId(null);
                        setCaptainId(p.id);
                      }}
                      className={`w-10 h-10 rounded-full font-bold flex items-center justify-center border-2 ${captainId === p.id ? "bg-yellow-400 border-yellow-500 text-yellow-900" : "bg-white border-gray-300 text-gray-400 hover:border-indigo-600 hover:text-indigo-600"}`}
                    >
                      C
                    </button>
                    <button
                      onClick={() => {
                        if (captainId === p.id) setCaptainId(null);
                        setViceCaptainId(p.id);
                      }}
                      className={`w-10 h-10 rounded-full font-bold flex items-center justify-center border-2 ${viceCaptainId === p.id ? "bg-indigo-600 border-indigo-700 text-white" : "bg-white border-gray-300 text-gray-400 hover:border-indigo-600 hover:text-indigo-600"}`}
                    >
                      VC
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
