import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { env } from "@/providers/env";

/**
 * Gate for destructive and scoring routes.
 * Passes when the request carries `Authorization: Bearer <CRON_SECRET>`,
 * or when the signed-in user's email is listed in ADMIN_EMAILS (comma-separated).
 */
export async function isAdminRequest(req: Request): Promise<boolean> {
  const { CRON_SECRET: cronSecret, ADMIN_EMAILS: admins } = env();
  const header = req.headers.get("authorization");
  if (cronSecret && header === `Bearer ${cronSecret}`) return true;

  if (admins.length === 0) return false;

  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  return !!email && admins.includes(email);
}

export function adminOnly() {
  return NextResponse.json({ message: "Admin access required." }, { status: 403 });
}
