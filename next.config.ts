import type { NextConfig } from "next";
import { securityHeaders } from "./src/providers/securityHeaders";

// An empty NEXTAUTH_URL makes next-auth call new URL("") and fail the build; treat it as unset.
if (process.env.NEXTAUTH_URL !== undefined && process.env.NEXTAUTH_URL.trim() === "") delete process.env.NEXTAUTH_URL;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    // Leagues became crews (F-C-01).
    return [
      { source: "/leagues", destination: "/crews", permanent: true },
      { source: "/leagues/:path*", destination: "/crews/:path*", permanent: true },
      { source: "/dashboard", destination: "/crews", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders(process.env.NODE_ENV !== "production") }];
  },
};

export default nextConfig;
