import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

/**
 * Gate for destructive and scoring routes.
 * Passes when the request carries `Authorization: Bearer <CRON_SECRET>`,
 * or when the signed-in user's email is listed in ADMIN_EMAILS (comma-separated).
 */
export async function isAdminRequest(req: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization");
  if (cronSecret && header === `Bearer ${cronSecret}`) return true;

  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (admins.length === 0) return false;

  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  return !!email && admins.includes(email);
}

export function adminOnly() {
  return NextResponse.json({ message: "Admin access required." }, { status: 403 });
}
