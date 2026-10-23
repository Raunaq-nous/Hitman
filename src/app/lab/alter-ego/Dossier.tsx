"use client";

import { useEffect, useState } from "react";
import { Stamp } from "@/ui";

function send(name: string, props: Record<string, unknown>): void {
  void fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, props }), keepalive: true }).catch(() => undefined);
}

/** Case-file reveal: the file opens CLASSIFIED and is stamped REVEALED (no motion under prefers-reduced-motion). */
export function DossierReveal({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setOpen(true), reduce ? 0 : 700);
    return () => clearTimeout(t);
  }, []);
  return (
    <section className="dossier" data-open={open} aria-live="polite" data-testid="dossier">
      <div className="dossier-stamp">{open ? <Stamp kind="revealed" animate /> : <Stamp kind="classified" />}</div>
      {open && (
        <div className="dossier-body">
          <h2 className="dossier-name" data-testid="alter-ego-label">{label}</h2>
          {children}
        </div>
      )}
    </section>
  );
}

/** Sharing is opt-in: a click creates a revocable link to the card; stopping sharing kills the link. */
export function ShareAlterEgo({ initialUrl }: { initialUrl: string | null }): React.JSX.Element {
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);
  async function share(): Promise<void> {
    const res = await fetch("/api/alter-ego/share", { method: "POST" });
    if (!res.ok) { setError("Couldn’t create your share link. Try again."); return; }
    setUrl(((await res.json()) as { url: string }).url);
    send("share_clicked", { kind: "alter_ego" });
  }
  async function stop(): Promise<void> {
    if ((await fetch("/api/alter-ego/share", { method: "DELETE" })).ok) setUrl(null);
  }
  return (
    <div className="nb-filters" data-testid="share-alter-ego">
      {url
        ? <><a className="lab-btn" href={url} target="_blank" rel="noopener" data-testid="share-link">Open your share card</a><button type="button" onClick={() => void stop()} data-testid="stop-sharing">Stop sharing</button></>
        : <button type="button" className="lab-btn" onClick={() => void share()} data-testid="share-button">Share my Alter Ego</button>}
      {error && <span role="alert" className="lab-error">{error}</span>}
    </div>
  );
}
