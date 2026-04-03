"use client";

import { useState } from "react";
import { Trophy, RefreshCw } from "lucide-react";

export default function SimulateMatchButton({ matchId }: { matchId: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const simulate = async () => {
    setLoading(true);
    const res = await fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId })
    });
    setLoading(false);
    if (res.ok) {
      setDone(true);
      window.location.reload();
    } else {
      alert("Simulation failed.");
    }
  };

  if (done) return null;

  return (
    <button 
      onClick={simulate}
      disabled={loading}
      className="bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-200 transition text-sm flex items-center"
    >
      <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      {loading ? "Simulating..." : "Simulate Results (Admin)"}
    </button>
  );
}
