// Admin check for pages: the signed-in user's email must be in ADMIN_EMAILS.
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { env } from "./env";

export async function isAdminSession(): Promise<boolean> {
  const admins = env().ADMIN_EMAILS;
  if (admins.length === 0) return false;
  const email = (await getServerSession(authOptions))?.user?.email?.toLowerCase();
  return !!email && admins.includes(email);
}
