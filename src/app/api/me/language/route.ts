import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUserId } from "@/providers/auth";
import { parseJson, route } from "@/providers/http";
import { clientIp, RateLimiter } from "@/providers/rateLimit";
import { DomainError } from "@/domain/shared/types";
import { LANG_COOKIE, LANGS } from "@/providers/i18n";
import { setLanguage } from "@/domain/users/service";

const input = z.object({ language: z.enum(LANGS) }).strict();
const limiter = new RateLimiter({ limit: 30, windowMs: 60_000 });

/** The nav language toggle: a cookie for everyone, and the account preference when signed in. */
export const POST = route(async (req: Request) => {
  if (!limiter.hit(clientIp(req.headers)).ok) throw new DomainError("RATE_LIMITED", "Too many changes. Try again in a minute.");
  const { language } = await parseJson(req, input);
  const userId = await currentUserId();
  if (userId) await setLanguage(userId, language);
  const res = NextResponse.json({ language, stored: userId ? "account" : "browser" });
  res.cookies.set(LANG_COOKIE, language, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  return res;
});
