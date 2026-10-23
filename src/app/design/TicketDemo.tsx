"use client";

import { Meter, Ticket } from "@/ui";

/** Gallery-only Ticket wiring: locking resolves locally after a short delay. */
export function TicketDemo(): React.JSX.Element {
  return (
    <Ticket
      question="Who bowls the 19th over?"
      context={[{ label: "Score", value: "142/5" }, { label: "Overs", value: "17.6" }, { label: "Need", value: "38 off 12" }, { label: "Req. rate", value: "19.00" }]}
      meter={<Meter label="Leverage" value={0.82} valueText="High (p92)" />}
      options={[{ id: "pace", label: "Pace", detail: "Yorkers into the pitch" }, { id: "spin", label: "Spin", detail: "Slower through the air" }]}
      onLock={() => new Promise((r) => setTimeout(r, 300))}
    />
  );
}
