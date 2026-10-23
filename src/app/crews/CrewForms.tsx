"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

async function post(url: string, body: unknown): Promise<{ ok: boolean; data: { id?: string; message?: string } }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

/** Create a crew or join one with a code. */
export function CrewForms(): React.JSX.Element {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent, url: string, body: unknown): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await post(url, body);
    setBusy(false);
    if (!r.ok || !r.data.id) return setError(r.data.message ?? "Something went wrong. Try again.");
    router.push(`/crews/${r.data.id}`);
    router.refresh();
  }

  return (
    <div className="crew-forms">
      <form className="ui-card crew-form" onSubmit={(e) => submit(e, "/api/crews", { name })}>
        <h2>Start a crew</h2>
        <label htmlFor="crew-name">Crew name</label>
        <input id="crew-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={40} />
        <button type="submit" disabled={busy}>Create crew</button>
      </form>
      <form className="ui-card crew-form" onSubmit={(e) => submit(e, "/api/crews/join", { inviteCode: code })}>
        <h2>Join with a code</h2>
        <label htmlFor="crew-code">Invite code</label>
        <input id="crew-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required pattern="[A-Za-z0-9]{6}" maxLength={6} autoCapitalize="characters" />
        <button type="submit" disabled={busy}>Join crew</button>
      </form>
      {error && <p role="alert" className="crew-error">{error}</p>}
    </div>
  );
}
