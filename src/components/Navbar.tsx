"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { LogOut, User, Radio } from "lucide-react";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="glass-panel text-white sticky top-0 z-50 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="flex items-center space-x-2 shrink-0">
            <img src="/icon-192.png" alt="Hitman" className="h-8 w-8 rounded-sm" />
            <span className="font-bold text-lg tracking-[0.2em] font-mono text-red-600">HITMAN</span>
          </Link>

          <div className="flex items-center justify-between w-full ml-6 lg:ml-10">
            <div className="hidden md:flex space-x-6 shrink-0">
              <Link href="/commentary" className="text-red-400 hover:text-white font-mono text-xs tracking-widest transition uppercase flex items-center space-x-1.5">
                <Radio size={10} className="animate-pulse" />
                <span>Live</span>
              </Link>
              <Link href="/schedule" className="text-gray-400 hover:text-white font-mono text-xs tracking-widest transition uppercase">Schedule</Link>
              <Link href="/leaderboard" className="text-gray-400 hover:text-white font-mono text-xs tracking-widest transition uppercase">Leaderboard</Link>
              <Link href="/teams" className="text-gray-400 hover:text-white font-mono text-xs tracking-widest transition uppercase">Teams</Link>
            </div>

            <div className="flex items-center space-x-3">
              {session ? (
                <>
                  <Link href="/dashboard" className="text-red-500 hover:text-white font-mono text-xs transition tracking-widest hidden sm:block">DASHBOARD</Link>
                  <div className="flex items-center space-x-2 bg-white/5 px-3 py-1 rounded-sm border border-white/10 cursor-default">
                    <User size={14} className="text-red-500" />
                    <span className="text-xs font-mono text-gray-400 hidden sm:block">{session.user?.name}</span>
                  </div>
                  <button onClick={() => signOut()} className="p-1.5 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-sm transition" title="Sign Out">
                    <LogOut size={16} />
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-gray-400 hover:text-white font-mono text-xs uppercase transition hidden sm:block">Login</Link>
                  <Link href="/register" className="neo-brutal bg-red-600 text-white px-4 py-1.5 rounded-sm font-bold font-mono hover:bg-red-700 transition text-xs">REGISTER</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
