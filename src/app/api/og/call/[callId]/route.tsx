import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { shareCard } from "@/domain/lab/service";
import { clientIp, RateLimiter } from "@/providers/rateLimit";
import { tokenValues } from "@/ui/tokenValues";

const limiter = new RateLimiter({ limit: 30, windowMs: 60_000 });

// "Called it" share card (F-C-03): a graded call as a 1200×630 image. Display name only; no prize language.
export async function GET(req: Request, ctx: { params: Promise<{ callId: string }> }): Promise<Response> {
  if (!limiter.hit(clientIp(req.headers)).ok) return NextResponse.json({ code: "RATE_LIMITED", message: "Too many requests." }, { status: 429 });
  const { callId } = await ctx.params;
  const card = await shareCard(callId);
  if (!card) return NextResponse.json({ code: "NOT_FOUND", message: "No graded call here." }, { status: 404 });
  const t = tokenValues(["bg", "text", "text-2", "professor"]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: t.bg, color: t.text, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, fontWeight: 800, letterSpacing: 2 }}>
          <span>ALTER EGO</span>
          <span>{card.heading}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 50, fontWeight: 800, lineHeight: 1.1 }}>{card.title}</div>
          <div style={{ fontSize: 34 }}>{card.confidence}</div>
          <div style={{ fontSize: 26, color: t["text-2"] }}>{card.moment}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 30, fontWeight: 700 }}>{card.displayName}</span>
            <span style={{ fontSize: 22, color: t.professor }}>{card.calibration}</span>
          </div>
          <span style={{ fontSize: 72, fontWeight: 800 }}>{card.grade}</span>
        </div>
      </div>
    ),
    // a graded review never changes, so the image can be cached
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=86400, immutable" } },
  );
}
