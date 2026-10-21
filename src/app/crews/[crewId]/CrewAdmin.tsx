"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

async function call(url: string, method: "POST" | "DELETE"): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const res = await fetch(url, { method });
  return { ok: res.ok, data: res.status === 204 ? {} : await res.json().catch(() => ({})) };
}

/** Invite link and code; owner can rotate the code. */
export function InvitePanel({ crewId, inviteCode, isOwner }: { crewId: string; inviteCode: string; isOwner: boolean }): React.JSX.Element {
  const router = useRouter();
  const [code, setCode] = useState(inviteCode);
  const [note, setNote] = useState<string | null>(null);
  const path = `/crews/join/${code}`;
  async function copy(): Promise<void> {
    await navigator.clipboard?.writeText(`${window.location.origin}${path}`).catch(() => undefined);
    setNote("Link copied.");
  }
  async function rotate(): Promise<void> {
    const r = await call(`/api/crews/${crewId}/rotate-code`, "POST");
    if (!r.ok) return setNote(String(r.data.message ?? "Couldn’t make a new code."));
    setCode(String(r.data.inviteCode));
    setNote("New code made. Old links and codes no longer work.");
    router.refresh();
  }
  return (
    <section className="ui-card crew-invite" aria-labelledby="invite-h">
      <h2 id="invite-h">Invite friends</h2>
      <p>Code <b className="tabular crew-code" data-testid="invite-code">{code}</b></p>
      <p className="crew-link"><span className="sr-only">Invite link: </span><code data-testid="invite-link">{path}</code></p>
      <div className="crew-actions">
        <button type="button" onClick={copy}>Copy link</button>
        {isOwner && <button type="button" onClick={rotate}>New code</button>}
      </div>
      <p aria-live="polite" className="crew-note">{note}</p>
    </section>
  );
}

export function RemoveMemberButton({ crewId, userId, name }: { crewId: string; userId: string; name: string }): React.JSX.Element {
  const router = useRouter();
  async function remove(): Promise<void> {
    if (!window.confirm(`Remove ${name} from this crew?`)) return;
    const r = await call(`/api/crews/${crewId}/members/${userId}`, "DELETE");
    if (r.ok) router.refresh();
    else window.alert(String(r.data.message ?? "Couldn’t remove them."));
  }
  return <button type="button" className="crew-small" onClick={remove}>Remove<span className="sr-only"> {name}</span></button>;
}

export function LeaveButton({ crewId }: { crewId: string }): React.JSX.Element {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  async function leave(): Promise<void> {
    if (!window.confirm("Leave this crew?")) return;
    const r = await call(`/api/crews/${crewId}/leave`, "POST");
    if (!r.ok) return setError(String(r.data.message ?? "Couldn’t leave."));
    router.push("/crews");
    router.refresh();
  }
  return (
    <div>
      <button type="button" className="crew-leave" onClick={leave}>Leave crew</button>
      {error && <p role="alert" className="crew-error">{error}</p>}
    </div>
  );
}
