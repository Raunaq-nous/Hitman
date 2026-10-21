"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Trophy } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (res.ok) {
        // sign straight in and continue where the visitor was heading (e.g. an invite link)
        await signIn("credentials", { email, password, redirect: false });
        const next = new URLSearchParams(window.location.search).get("callbackUrl");
        const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/crews";
        router.push(`/onboarding?next=${encodeURIComponent(dest)}`);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.message || "Failed to register");
        setLoading(false);
      }
    } catch (err) {
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-[calc(100vh-8rem)]">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 bg-red-100 flex justify-center items-center rounded-full mb-4">
            <Trophy className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight font-mono">Join ALTER EGO</h2>
          <p className="text-sm text-gray-500 mt-2 font-mono">Where Every Pick Wins the Match</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100 text-center">
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="f-full-name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              id="f-full-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-[var(--ink)] placeholder:text-gray-500 focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all outline-none"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="f-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="f-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-[var(--ink)] placeholder:text-gray-500 focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="f-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              id="f-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-[var(--ink)] placeholder:text-gray-500 focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all outline-none"
              placeholder="At least 10 characters"
              minLength={10}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white font-bold font-mono tracking-widest py-3 px-4 rounded-lg hover:bg-red-700 hover:shadow-[0_0_15px_rgba(220,38,38,0.5)] focus:ring-4 focus:ring-red-200 transition-all flex justify-center items-center mt-2"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-red-600 hover:text-red-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
