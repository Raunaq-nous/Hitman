"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";

// The landing page brings its own header. Every other route uses the token-based shell (light and dark).
export default function AppShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  const pathname = usePathname();
  if (pathname === "/") return <>{children}</>;
  return (
    <div className="shell">
      <Navbar />
      <div id="main" className="shell-main" tabIndex={-1}>{children}</div>
      <footer className="shell-foot">
        <nav aria-label="Legal">
          <Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/attributions">Attributions</Link><Link href="/ai">How AI is used</Link>
        </nav>
        <p>Free to play. No money, ever. Beta for ages 18+.</p>
      </footer>
    </div>
  );
}
