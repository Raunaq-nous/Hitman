import Link from "next/link";
import { Trophy, Users, TrendingUp, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full py-16 md:py-24 flex flex-col items-center text-center">
        <div className="inline-block mb-4 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold tracking-wide">
          Private Fantasy Leagues for Friends
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight leading-tight mb-6">
          Where Every Pick <br className="hidden md:block" /> Wins the Match.
        </h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mb-10">
          Build your ultimate cricket fantasy team, create private leagues, invite your friends, and compete for the top spot. 100% free-to-play.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/register" className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1">
            Start Playing Free
          </Link>
          <Link href="/login" className="bg-white text-indigo-600 border border-indigo-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-indigo-50 transition">
            I Already Have an Account
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-md transition">
            <div className="h-14 w-14 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-6">
              <Users size={28} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Private Leagues</h3>
            <p className="text-gray-600">Create closed groups and invite friends or colleagues using a unique invite code.</p>
          </div>
          
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-md transition">
            <div className="h-14 w-14 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-6">
              <Trophy size={28} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Strategic Picks</h3>
            <p className="text-gray-600">Manage a 100-credit budget. Pick 11 players across roles to maximize your fantasy points.</p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-md transition">
            <div className="h-14 w-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
              <TrendingUp size={28} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Live Leaderboards</h3>
            <p className="text-gray-600">Track points dynamically during matches and see who dominates the league rankings.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
