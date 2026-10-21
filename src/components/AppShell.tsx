"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

// The landing page brings its own header. Every other route uses the token-based shell (light and dark).
export default function AppShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  const pathname = usePathname();
  if (pathname === "/") return <>{children}</>;
  return (
    <div className="shell">
      <Navbar />
      <div id="main" className="shell-main" tabIndex={-1}>{children}</div>
    </div>
  );
}
