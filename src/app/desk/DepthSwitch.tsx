"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

const DEPTHS = [["quick"], ["tactical"], ["analyst"]] as const;
type Depth = (typeof DEPTHS)[number][0];
const KEY = "alterego.desk.depth";
const Ctx = createContext<Depth>("quick");

// the reader's choice lives in localStorage (per device); memory keeps it for the visit when storage is blocked
const listeners = new Set<() => void>();
let chosen: Depth = "quick";
const isDepth = (v: unknown): v is Depth => DEPTHS.some(([d]) => d === v);
function read(): Depth {
  try { const saved = localStorage.getItem(KEY); if (isDepth(saved)) return saved; } catch { /* storage unavailable */ }
  return chosen;
}
function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => { listeners.delete(cb); window.removeEventListener("storage", cb); };
}
function choose(d: Depth): void {
  chosen = d;
  try { localStorage.setItem(KEY, d); } catch { /* storage unavailable */ }
  listeners.forEach((l) => l());
}

/** Holds the reader's depth (remembered on this device) and renders the switch above its children. */
export function DepthProvider({ labels, children }: { labels: { legend: string } & Record<Depth, string>; children: React.ReactNode }): React.JSX.Element {
  const depth = useSyncExternalStore(subscribe, read, () => "quick" as Depth);
  return (
    <Ctx.Provider value={depth}>
      <fieldset className="desk-depth" data-testid="depth-switch">
        <legend>{labels.legend}</legend>
        {DEPTHS.map(([d]) => (
          <label key={d}><input type="radio" name="depth" value={d} checked={depth === d} onChange={() => choose(d)} /> {labels[d]}</label>
        ))}
      </fieldset>
      {children}
    </Ctx.Provider>
  );
}

/** The item's text at the chosen depth (all three are rendered on the server from verified claims). */
export function DepthText({ texts }: { texts: Record<Depth, string[]> }): React.JSX.Element {
  const depth = useContext(Ctx);
  return (
    <div className="desk-text" data-testid="depth-text" data-depth={depth} aria-live="polite">
      {texts[depth].map((t, i) => <p key={i}>{t}</p>)}
    </div>
  );
}
