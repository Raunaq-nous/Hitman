"use client";

import { useEffect, useState } from "react";
import { Stamp } from "@/ui";

function send(name: string, props: Record<string, unknown>): void {
  void fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, props }), keepalive: true }).catch(() => undefined);
}

/** Case-file reveal: the file opens CLASSIFIED and is stamped REVEALED (no motion under prefers-reduced-motion). */
export function DossierReveal({ persona, label, children }: { persona: string; label: string; children: React.ReactNode }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setOpen(true), reduce ? 0 : 700);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => { if (open) send("alter_ego_revealed", { persona }); }, [open, persona]);
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

export function ShareAlterEgo({ href }: { href: string }): React.JSX.Element {
  return <a className="lab-btn" href={href} target="_blank" rel="noopener" data-testid="share-alter-ego" onClick={() => send("share_clicked", { kind: "alter_ego" })}>Share card (image)</a>;
}
