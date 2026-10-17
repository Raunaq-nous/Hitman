"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

// The landing page brings its own header and design system. Every other route keeps the
// existing dark app shell until it is redesigned in Phase 1.
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/") return <>{children}</>;
  return (
    <div className="app-dark min-h-screen flex flex-col text-gray-100 selection:bg-red-600 selection:text-white">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
