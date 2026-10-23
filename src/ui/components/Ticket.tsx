"use client";

import { useId, useState } from "react";
import { Stamp } from "./Stamp";

export interface TicketOption { id: string; label: string; detail?: string }
/** confidence in percent (50–99), as on the slider */
export interface TicketLock { optionId: string; confidence: number }

export interface TicketProps {
  question: string;
  context: { label: string; value: string }[];
  options: TicketOption[];
  /** Pre-locked state, e.g. when revisiting a call. */
  locked?: TicketLock | null;
  /** Called on Lock; resolve to confirm, reject with a message to show an error. */
  onLock?: (lock: TicketLock) => Promise<void>;
  meter?: React.ReactNode;
}

/** Ticket Call: context strip, the question, 2–3 options, confidence 50–99% (default 60), and a Lock button. */
export function Ticket({ question, context, options, locked = null, onLock, meter }: TicketProps): React.JSX.Element {
  const id = useId();
  const [pick, setPick] = useState<string | null>(locked?.optionId ?? null);
  const [confidence, setConfidence] = useState(locked?.confidence ?? 60);
  const [state, setState] = useState<"open" | "locking" | "locked">(locked ? "locked" : "open");
  const [error, setError] = useState<string | null>(null);
  const isLocked = state === "locked";

  async function lock(): Promise<void> {
    if (!pick || state !== "open") return;
    setState("locking");
    setError(null);
    try {
      await onLock?.({ optionId: pick, confidence });
      setState("locked");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t lock your call. Try again.");
      setState("open");
    }
  }

  return (
    <section className="ui-card ui-ticket" aria-labelledby={`${id}-q`} data-testid="ticket">
      {isLocked && <span className="ui-ticket-stamp"><Stamp kind="locked" animate /></span>}
      <div className="ui-ticket-context tabular">
        {context.map((c) => <span key={c.label}>{c.label} <b>{c.value}</b></span>)}
      </div>
      {meter}
      <h3 id={`${id}-q`}>{question}</h3>
      <fieldset disabled={isLocked || state === "locking"}>
        <legend className="sr-only">Your call</legend>
        {options.map((o) => (
          <label key={o.id} className="ui-option">
            <input type="radio" name={`${id}-pick`} value={o.id} checked={pick === o.id} onChange={() => setPick(o.id)} />
            <span>{o.label}{o.detail && <small>{o.detail}</small>}</span>
          </label>
        ))}
        <div className="ui-confidence">
          <label htmlFor={`${id}-conf`}><span>How sure are you?</span><span className="tabular">{confidence}%</span></label>
          <input id={`${id}-conf`} type="range" min={50} max={99} step={1} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} aria-valuetext={`${confidence} percent`} />
        </div>
      </fieldset>
      {!isLocked && (
        <button type="button" className="ui-lock" onClick={lock} disabled={!pick || state === "locking"}>
          {state === "locking" ? "Locking…" : "Lock my call"}
        </button>
      )}
      {error && <p role="alert" style={{ color: "var(--brick)", margin: 0 }}>{error}</p>}
      <p className="sr-only" aria-live="polite">{isLocked ? "Your call is locked." : ""}</p>
    </section>
  );
}
