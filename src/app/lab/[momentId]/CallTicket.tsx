"use client";

import Link from "next/link";
import { useState } from "react";
import { Meter, Ticket, type TicketLock } from "@/ui";
import type { PrelockMoment } from "@/domain/lab/types";

/** The call card for one moment; Lock records the call on the server (server time, one pick per call). */
export function CallTicket({ moment }: { moment: PrelockMoment }): React.JSX.Element {
  const [needsSignIn, setNeedsSignIn] = useState(false);
  async function onLock(lock: TicketLock): Promise<void> {
    const res = await fetch("/api/lab/calls", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ momentId: moment.id, option: lock.optionId, confidence: lock.confidence }) });
    if (res.status === 401) { setNeedsSignIn(true); throw new Error("Sign in to lock your call."); }
    if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { message?: string }).message ?? "Couldn’t lock your call. Try again.");
  }
  const m = moment;
  return (
    <div className="lab-call">
      <Ticket
        question={m.question}
        context={[
          { label: "Target", value: String(m.target) },
          { label: "Needs", value: `${m.runsRequired} off ${m.ballsLeft}` },
          { label: "Overs", value: m.overs },
          { label: "Req. rate", value: m.requiredRate.toFixed(2) },
          { label: "Wickets in hand", value: String(m.wicketsInHand) },
        ]}
        meter={<Meter label="Leverage" value={Math.min(1, m.leverage / 0.5)} valueText={`${m.leverage.toFixed(2)} — the next ball can move win probability this much (top 10% of moments)`} />}
        options={m.options.map((o) => ({ id: o.option, label: o.label[0].toUpperCase() + o.label.slice(1) }))}
        onLock={onLock}
      />
      <p className="lab-note">On strike: {m.striker} · Bowling: {m.bowler} · Last {m.recent.deliveries} deliveries: {m.recent.runs} runs, {m.recent.wickets} {m.recent.wickets === 1 ? "wicket" : "wickets"}</p>
      {needsSignIn && <p className="lab-error" role="alert"><Link href={`/login?callbackUrl=${encodeURIComponent(`/lab/${m.id}`)}`}>Sign in</Link> to lock your call.</p>}
    </div>
  );
}
