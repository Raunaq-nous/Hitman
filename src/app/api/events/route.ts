import { NextResponse } from "next/server";
import { currentUserId } from "@/providers/auth";
import { parseJson, route } from "@/providers/http";
import { clientIp, RateLimiter } from "@/providers/rateLimit";
import { DomainError } from "@/domain/shared/types";
import { track } from "@/domain/analytics/service";
import { clientEventInput, type EventName, type EventProps } from "@/domain/analytics/types";

const limiter = new RateLimiter({ limit: 120, windowMs: 60_000 });

/** Client-side events (receipt opened, depth changed…) recorded server-side with the session's user id. */
export const POST = route(async (req: Request) => {
  if (!limiter.hit(clientIp(req.headers)).ok) throw new DomainError("RATE_LIMITED", "Too many events.");
  const { name, props } = await parseJson(req, clientEventInput);
  const { id } = await track(name, props as EventProps<EventName>, await currentUserId());
  return NextResponse.json({ id }, { status: 201 });
});
