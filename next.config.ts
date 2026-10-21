import type { NextConfig } from "next";

// An empty NEXTAUTH_URL makes next-auth call new URL("") and fail the build; treat it as unset.
if (process.env.NEXTAUTH_URL !== undefined && process.env.NEXTAUTH_URL.trim() === "") delete process.env.NEXTAUTH_URL;

const nextConfig: NextConfig = {};

export default nextConfig;
