import { NextResponse } from "next/server";
import { currentUserId } from "@/providers/auth";
import { parseJson, route } from "@/providers/http";
import { setPreferences } from "@/domain/users/service";
import { preferencesInput } from "@/domain/users/types";

/** Save onboarding choices: on the account when signed in, and as a language cookie for everyone. */
export const POST = route(async (req: Request) => {
  const prefs = await parseJson(req, preferencesInput);
  const userId = await currentUserId();
  const saved = userId ? await setPreferences(userId, prefs) : prefs;
  const res = NextResponse.json({ ...saved, stored: userId ? "account" : "browser" });
  res.cookies.set("ae_lang", prefs.language, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  res.cookies.set("ae_sports", prefs.sports.join(","), { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  return res;
});

export const GET = route(async () => {
  const { requireUserId } = await import("@/providers/auth");
  const { getPreferences } = await import("@/domain/users/service");
  return NextResponse.json(await getPreferences(await requireUserId()));
});
