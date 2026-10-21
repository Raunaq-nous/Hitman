import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/providers/auth";
import { parseJson, route } from "@/providers/http";
import { RateLimiter } from "@/providers/rateLimit";
import { DomainError } from "@/domain/shared/types";
import { answer } from "@/domain/planner/service";

const limiter = new RateLimiter({ limit: 30, windowMs: 60_000 });

/** Ask a question: the planner answers from the database; language only phrases verified facts. */
export const POST = route(async (req: Request) => {
  const userId = await requireUserId();
  if (!limiter.hit(userId).ok) throw new DomainError("RATE_LIMITED", "Too many questions. Try again in a minute.");
  const { question } = await parseJson(req, z.object({ question: z.string().max(300) }));
  return NextResponse.json(await answer(userId, question));
});
