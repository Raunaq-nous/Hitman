"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Record a product event (src/domain/analytics); never blocks the page and never fails it. */
function send(name: string, props: Record<string, unknown>): void {
  void fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, props }), keepalive: true }).catch(() => undefined);
}

/** moment_viewed, once per page view. */
export function MomentViewed({ momentId }: { momentId: string }): null {
  useEffect(() => { send("moment_viewed", { momentId }); }, [momentId]);
  return null;
}

/** The Review's Next read button: records next_read_started, then navigates. */
export function NextReadLink({ fromCallId, momentId }: { fromCallId: string; momentId: string | null }): React.JSX.Element {
  return (
    <Link className="lab-btn" href={momentId ? `/lab/${momentId}` : "/lab"} data-testid="next-read" onClick={() => { if (momentId) send("next_read_started", { fromCallId, momentId }); }}>
      Next read
    </Link>
  );
}
