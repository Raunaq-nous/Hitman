import Link from "next/link";
import { Trophy, Users, TrendingUp, Radio, Smartphone, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full py-16 md:py-24 flex flex-col items-center text-center">
        <div className="inline-block mb-8 px-4 py-1 border border-red-500/50 bg-red-600/10 text-red-400 rounded-full text-xs font-mono tracking-[0.3em] uppercase">
          IPL 2026 · Live Fantasy Cricket
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-widest leading-tight mb-6 font-mono">
          HIT<span className="text-red-500">MAN</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-400 font-mono max-w-2xl mb-10">
          Build your ultimate cricket fantasy team, create private leagues, invite your friends, and compete for the top payout pool. Real-time live scores from CricketData.org included.
        </p>
        <div className="flex flex-col sm:flex-row gap-6">
          <Link href="/register" className="neo-brutal bg-red-600 text-black px-8 py-4 rounded-sm font-bold font-mono text-lg hover:bg-red-500 transition">
            START PLAYING
          </Link>
          <Link href="/commentary" className="glass-panel text-white hover:text-red-500 px-8 py-4 rounded-sm font-bold font-mono text-lg transition flex items-center justify-center space-x-2">
            <Radio size={18} className="animate-pulse text-red-500" />
            <span>LIVE COMMENTARY</span>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-panel p-8 rounded-sm flex flex-col items-center text-center transition hover:border-red-500/50">
            <div className="h-14 w-14 bg-white/5 border border-white/10 text-red-500 rounded-full flex items-center justify-center mb-6">
              <Users size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 font-mono">PRIVATE LEAGUES</h3>
            <p className="text-gray-400 font-mono text-sm leading-relaxed">Create closed groups and invite up to 30 friends using a unique invite code. Dynamic payouts scale with player count.</p>
          </div>

          <div className="glass-panel p-8 rounded-sm flex flex-col items-center text-center transition hover:border-red-500/50">
            <div className="h-14 w-14 bg-white/5 border border-white/10 text-red-500 rounded-full flex items-center justify-center mb-6">
              <Zap size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 font-mono">LIVE SCORES</h3>
            <p className="text-gray-400 font-mono text-sm leading-relaxed">100% accurate real-time scores from CricketData.org API. IPL 2026 matches auto-detected and displayed live.</p>
          </div>

          <div className="glass-panel p-8 rounded-sm flex flex-col items-center text-center transition hover:border-red-500/50">
            <div className="h-14 w-14 bg-white/5 border border-white/10 text-red-500 rounded-full flex items-center justify-center mb-6">
              <Smartphone size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 font-mono">MOBILE APP</h3>
            <p className="text-gray-400 font-mono text-sm leading-relaxed">Install as an app on your phone. Works offline, zero downloads from app store. Just tap "Add to Home Screen".</p>
          </div>
        </div>
      </section>

      {/* Install CTA */}
      <section className="w-full py-12">
        <div className="glass-panel p-8 rounded-sm border-red-500/20 text-center">
          <h2 className="text-2xl font-black text-white font-mono tracking-widest mb-4">
            📱 INSTALL ON YOUR PHONE
          </h2>
          <p className="text-gray-400 font-mono text-sm max-w-xl mx-auto mb-6">
            HITMAN is a Progressive Web App. Share the link with your friends — they can install it directly from the browser. No app store needed, completely free.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <div className="bg-black/50 border border-white/10 rounded-sm p-4 font-mono text-xs text-gray-300">
              <strong className="text-white">iPhone:</strong> Safari → Share → Add to Home Screen
            </div>
            <div className="bg-black/50 border border-white/10 rounded-sm p-4 font-mono text-xs text-gray-300">
              <strong className="text-white">Android:</strong> Chrome → Menu → Install App
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
