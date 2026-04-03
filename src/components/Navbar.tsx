"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Trophy, LogOut, User } from "lucide-react";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="bg-indigo-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Trophy className="h-8 w-8 text-yellow-400" />
            <span className="font-bold text-xl tracking-tight">Pitch11</span>
          </Link>
          <div className="flex items-center space-x-4">
            {session ? (
              <>
                <Link href="/dashboard" className="hover:text-indigo-200 transition">Dashboard</Link>
                <div className="flex items-center space-x-2 bg-indigo-700 px-3 py-1 rounded-full cursor-default">
                  <User size={16} />
                  <span className="text-sm">{session.user?.name}</span>
                </div>
                <button 
                  onClick={() => signOut()}
                  className="p-2 hover:bg-indigo-700 rounded-full transition"
                  title="Sign Out"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="hover:text-indigo-200 transition">Login</Link>
                <Link href="/register" className="bg-yellow-400 text-indigo-900 px-4 py-2 rounded-md font-semibold hover:bg-yellow-300 transition shadow-sm">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
