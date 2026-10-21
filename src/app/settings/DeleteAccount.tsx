"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export function DeleteAccount(): React.JSX.Element {
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/me/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm }) });
    if (res.status !== 204) {
      setBusy(false);
      return setError(((await res.json().catch(() => ({}))) as { message?: string }).message ?? "Couldn’t delete your account.");
    }
    // redirect ourselves: next-auth would use NEXTAUTH_URL, which may be unset locally
    await signOut({ redirect: false });
    window.location.assign("/?deleted=1");
  }
  return (
    <form className="crew-form" onSubmit={submit} aria-describedby="delete-help">
      <p id="delete-help">This permanently deletes your account, preferences, crew memberships, reports, blocks, teams and analytics events. Crews you own pass to their longest-standing member. It can’t be undone.</p>
      <label htmlFor="delete-confirm">Type DELETE to confirm</label>
      <input id="delete-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
      <button type="submit" className="crew-leave" disabled={confirm !== "DELETE" || busy}>Delete my account</button>
      {error && <p role="alert" className="crew-error">{error}</p>}
    </form>
  );
}
