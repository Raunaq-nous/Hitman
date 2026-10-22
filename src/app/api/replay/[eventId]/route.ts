import { replayFrames, replayStream } from "@/domain/facts/replay";
import { route } from "@/providers/http";
import { clientIp, RateLimiter } from "@/providers/rateLimit";
import { DomainError } from "@/domain/shared/types";

const limiter = new RateLimiter({ limit: 30, windowMs: 60_000 });
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Server-sent events: an event's incidents replayed at ?speed=× (default 60). Resumes after Last-Event-ID. */
export const GET = route(async (req: Request, { params }: { params: Promise<{ eventId: string }> }) => {
  if (!limiter.hit(clientIp(req.headers)).ok) throw new DomainError("RATE_LIMITED", "Too many replays.");
  const { eventId } = await params;
  const url = new URL(req.url);
  const speed = Number(url.searchParams.get("speed") ?? 60);
  const raw = req.headers.get("last-event-id") || url.searchParams.get("from") || "";
  const last = raw.trim() === "" ? -1 : Number(raw);
  const frames = await replayFrames(eventId, speed);
  const from = Number.isInteger(last) && last >= 0 ? Math.min(last + 1, frames.length) : 0;
  return new Response(replayStream(frames, { from, sleep }), {
    headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", connection: "keep-alive" },
  });
});
