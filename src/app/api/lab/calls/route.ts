import { NextResponse } from "next/server";
import { requireUserId } from "@/providers/auth";
import { parseJson, route } from "@/providers/http";
import { RateLimiter } from "@/providers/rateLimit";
import { DomainError } from "@/domain/shared/types";
import { lockCall } from "@/domain/lab/service";
import { lockInput } from "@/domain/lab/types";

const limiter = new RateLimiter({ limit: 20, windowMs: 60_000 });

/** Lock a Decision Lab call: signed in, one pick, server time (F-L-02). */
export const POST = route(async (req: Request) => {
  const userId = await requireUserId();
  if (!limiter.hit(userId).ok) throw new DomainError("RATE_LIMITED", "Too many calls. Try again in a minute.");
  const input = await parseJson(req, lockInput);
  return NextResponse.json(await lockCall(userId, input), { status: 201 });
});
