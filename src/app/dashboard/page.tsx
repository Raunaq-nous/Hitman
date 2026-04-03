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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Your Leagues</h1>
          <p className="text-gray-500 mt-1">Manage and access your fantasy groups</p>
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
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center flex flex-col items-center">
              <div className="h-16 w-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-4">
                <Trophy size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">No leagues yet</h3>
              <p className="text-gray-500 max-w-sm mt-2">Create a new league or join an existing one using an invite code from your friends.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {leagues.map((lg) => (
                <Link key={lg.id} href={`/leagues/${lg.id}`}>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition group cursor-pointer h-full flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-indigo-50 text-indigo-600 p-2 text-sm font-bold rounded-md">
                          {lg.inviteCode}
                        </div>
                        <Trophy className="text-gray-300 group-hover:text-yellow-500 transition" size={24} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1 line-clamp-1">{lg.name}</h3>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <PlusCircle className="mr-2 text-indigo-600" size={20} />
              Create League
            </h3>
            <form onSubmit={createLeague}>
              <input
                type="text"
                placeholder="League Name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-indigo-600 outline-none transition"
                value={newLeagueName}
                onChange={(e) => setNewLeagueName(e.target.value)}
                required
              />
              <button 
                type="submit"
                className="w-full bg-indigo-600 text-white font-semibold py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                Create
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Search className="mr-2 text-yellow-600" size={20} />
              Join League
            </h3>
            <form onSubmit={joinLeague}>
              <input
                type="text"
                placeholder="Enter 6-digit Code"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-indigo-600 outline-none transition uppercase"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                required
              />
              <button 
                type="submit"
                className="w-full bg-white text-indigo-600 border border-indigo-200 font-semibold py-2 rounded-lg hover:bg-indigo-50 transition"
              >
                Join with Code
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
