"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlusCircle, Search, Trophy, Loader2 } from "lucide-react";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [leagues, setLeagues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchLeagues();
    }
  }, [status, router]);

  const fetchLeagues = async () => {
    try {
      const res = await fetch("/api/leagues");
      if (res.ok) {
        const data = await res.json();
        // Since members are also fetched, we just display joined leagues
        setLeagues(data.joinedLeagues);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newLeagueName })
      });
      if (res.ok) {
        setNewLeagueName("");
        setIsCreating(false);
        fetchLeagues();
      } else {
        const data = await res.json();
        setError(data.message);
      }
    } catch (err) {
      setError("Error creating league");
    }
  };

  const joinLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/leagues/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: joinCode })
      });
      if (res.ok) {
        setJoinCode("");
        fetchLeagues();
      } else {
        const data = await res.json();
        setError(data.message);
      }
    } catch (err) {
      setError("Error joining league");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-[0.1em] font-mono">YOUR LEAGUES</h1>
          <p className="text-gray-400 mt-1 font-mono text-sm leading-relaxed">Manage and access your fantasy groups and pools.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {leagues.length === 0 ? (
            <div className="glass-panel border-dashed border-white/20 rounded-sm p-12 text-center flex flex-col items-center">
              <div className="h-16 w-16 bg-white/5 text-gray-400 rounded-full flex items-center justify-center mb-4 border border-white/10">
                <Trophy size={32} />
              </div>
              <h3 className="text-lg font-bold text-white font-mono">NO LEAGUES YET</h3>
              <p className="text-gray-400 max-w-sm mt-2 font-mono text-xs">Create a new league or join an existing one using an invite code from your friends.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {leagues.map((lg) => (
                <Link key={lg.id} href={`/leagues/${lg.id}`}>
                  <div className="glass-panel p-6 rounded-sm hover:-translate-y-1 hover:border-red-500 transition group cursor-pointer h-full flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-red-600/10 border border-red-500/30 text-red-500 px-3 py-1 text-sm font-mono tracking-widest rounded-sm">
                          {lg.inviteCode}
                        </div>
                        <Trophy className="text-gray-500 group-hover:text-red-500 transition" size={24} />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-1 line-clamp-1 font-mono">{lg.name}</h3>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-sm">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center font-mono">
              <PlusCircle className="mr-2 text-red-500" size={20} />
              CREATE LEAGUE
            </h3>
            <form onSubmit={createLeague}>
              <input
                type="text"
                placeholder="LEAGUE NAME"
                className="w-full px-4 py-3 bg-black/50 border border-white/20 text-white rounded-sm mb-3 focus:border-red-500 focus:outline-none transition font-mono placeholder:text-gray-600"
                value={newLeagueName}
                onChange={(e) => setNewLeagueName(e.target.value)}
                required
              />
              <button 
                type="submit"
                className="w-full neo-brutal bg-red-600 text-black font-bold py-3 rounded-sm hover:bg-red-500 transition font-mono"
              >
                CREATE
              </button>
            </form>
          </div>

          <div className="glass-panel p-6 rounded-sm">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center font-mono">
              <Search className="mr-2 text-white" size={20} />
              JOIN LEAGUE
            </h3>
            <form onSubmit={joinLeague}>
              <input
                type="text"
                placeholder="6-DIGIT CODE"
                className="w-full px-4 py-3 bg-black/50 border border-white/20 text-white rounded-sm mb-3 focus:border-red-500 focus:outline-none transition uppercase font-mono tracking-widest placeholder:text-gray-600"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                required
              />
              <button 
                type="submit"
                className="w-full glass-panel text-white font-bold py-3 rounded-sm hover:text-red-500 hover:border-red-500/50 transition font-mono"
              >
                JOIN WITH CODE
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
