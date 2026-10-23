import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { alterEgoCardByToken } from "@/domain/lab/service";
import { clientIp, RateLimiter } from "@/providers/rateLimit";
import { tokenValues } from "@/ui/tokenValues";

const limiter = new RateLimiter({ limit: 30, windowMs: 60_000 });

// Alter Ego share card (F-R-04), behind the fan's opt-in, revocable share token: display name, persona and the lead
// evidence. No personal data beyond the display name; reads existing grades only.
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }): Promise<Response> {
  if (!limiter.hit(clientIp(req.headers)).ok) return NextResponse.json({ code: "RATE_LIMITED", message: "Too many requests." }, { status: 429 });
  const card = await alterEgoCardByToken((await ctx.params).token);
  if (!card) return NextResponse.json({ code: "NOT_FOUND", message: "No revealed Alter Ego here." }, { status: 404 });
  const t = tokenValues(["bg", "text", "text-2", "brick"]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: t.bg, color: t.text, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, fontWeight: 800, letterSpacing: 2 }}>
          <span>ALTER EGO</span>
          <span style={{ color: t.brick, border: `4px solid ${t.brick}`, padding: "4px 14px", transform: "rotate(-6deg)" }}>REVEALED</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05 }}>{card.label}</div>
          <div style={{ fontSize: 30, color: t["text-2"] }}>{card.evidence}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26 }}>
          <span style={{ fontWeight: 700 }}>{card.displayName} · {card.graded} graded calls</span>
          <span style={{ color: t["text-2"] }}>{card.calibration}</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
