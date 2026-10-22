// Replay a stored event's incidents in the order they were observed, on a replay clock (observed gaps ÷ speed).
// Historical adapters give deterministic observedAt values, so a replay is reproducible frame for frame.
import { DomainError } from "@/domain/shared/types";
import { canUse } from "@/providers/rights";
import * as repo from "./repo";
import { asOf, type IncidentRow } from "./service";

export interface ReplayFrame {
  id: number;
  /** milliseconds after the replay starts */
  at: number;
  incident: { type: string; actor: string | null; payload: unknown; sourceId: string; sourceClass: string; observedAt: string };
  /** running cricket score for the incident's innings; null for other incident types */
  score: { innings: number; runs: number; wickets: number; legalBalls: number } | null;
}

export const MAX_SPEED = 3600;

export function planReplay(rows: IncidentRow[], speed: number): ReplayFrame[] {
  const ordered = [...rows].sort((a, b) => a.observedAt.getTime() - b.observedAt.getTime() || a.t - b.t || a.seq - b.seq);
  const start = ordered[0]?.observedAt.getTime() ?? 0;
  const score = { innings: 0, runs: 0, wickets: 0, legalBalls: 0 };
  return ordered.map((r, id) => {
    let s: ReplayFrame["score"] = null;
    if (r.type === "ball") {
      const p = r.payload as { innings?: number; runs?: number; extras?: number; extraType?: string | null; wicket?: boolean };
      const innings = p.innings ?? 1;
      if (innings !== score.innings) Object.assign(score, { innings, runs: 0, wickets: 0, legalBalls: 0 });
      score.runs += (p.runs ?? 0) + (p.extras ?? 0);
      if (p.wicket) score.wickets += 1;
      if (p.extraType !== "wides" && p.extraType !== "noballs") score.legalBalls += 1;
      s = { ...score };
    }
    return {
      id,
      at: Math.round((r.observedAt.getTime() - start) / speed),
      incident: { type: r.type, actor: r.actor, payload: r.payload, sourceId: r.sourceId, sourceClass: r.sourceClass, observedAt: r.observedAt.toISOString() },
      score: s,
    };
  });
}

/** Every displayable, current incident of an event, planned for replay at `speed`×. */
export async function replayFrames(eventId: string, speed: number): Promise<ReplayFrame[]> {
  if (!Number.isFinite(speed) || speed < 1 || speed > MAX_SPEED) throw new DomainError("INVALID", `Speed must be between 1 and ${MAX_SPEED}.`);
  if (!(await repo.eventExists(eventId))) throw new DomainError("NOT_FOUND", "No such event.");
  const rows = (await repo.incidentsObservedBy(eventId, new Date())).filter((r) => canUse(r.sourceId, "display"));
  return planReplay(asOf(rows), speed);
}

export function sseEncode(event: string, data: unknown, id?: number): string {
  return `${id === undefined ? "" : `id: ${id}\n`}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** Stream frames from `from` onward, waiting out each gap on the replay clock; ends with an `end` event. */
export function replayStream(frames: ReplayFrame[], opts: { from: number; sleep: (ms: number) => Promise<void> }): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const rest = frames.slice(opts.from);
  let i = 0;
  return new ReadableStream({
    async pull(controller) {
      if (i >= rest.length) {
        controller.enqueue(enc.encode(sseEncode("end", { frames: frames.length })));
        controller.close();
        return;
      }
      const f = rest[i];
      await opts.sleep(i === 0 ? 0 : f.at - rest[i - 1].at);
      controller.enqueue(enc.encode(sseEncode("incident", f, f.id)));
      i++;
    },
  });
}
