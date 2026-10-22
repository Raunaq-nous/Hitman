"use client";

import { useId, useRef, useState } from "react";
import type { Receipt as ReceiptData } from "@/domain/sources/types";

const fmt = (iso: string): string => `${new Date(iso).toISOString().slice(0, 16).replace("T", " ")} UTC`;

/**
 * The receipt drawer on a number: source, source class, when we observed it and the source's attribution.
 * A button opens it; Escape closes it and returns focus to the button.
 */
export function Receipt({ receipt, attribution, details, children }: { receipt: ReceiptData; attribution?: string; details?: string[]; children?: React.ReactNode }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const close = (): void => { setOpen(false); button.current?.focus(); };
  return (
    <span className="ui-receipt" data-open={open}>
      <button ref={button} type="button" className="ui-receipt-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        {children ?? `src ${receipt.sourceId}`}<span className="sr-only"> (receipt: source details)</span>
      </button>
      <span id={id} role="region" aria-label="Receipt" className="ui-receipt-drawer" hidden={!open} onKeyDown={(e) => { if (e.key === "Escape") close(); }}>
        <dl>
          <dt>Source</dt><dd>{receipt.sourceId}</dd>
          <dt>Class</dt><dd>{receipt.sourceClass.replace(/_/g, " ").toLowerCase()}</dd>
          <dt>Observed</dt><dd><time dateTime={receipt.observedAt}>{fmt(receipt.observedAt)}</time></dd>
          {attribution && <><dt>Attribution</dt><dd>{attribution}</dd></>}
        </dl>
        {details?.map((d, i) => <span key={i} className="ui-receipt-detail">{d}</span>)}
        <button type="button" className="ui-receipt-close" onClick={close}>Close<span className="sr-only"> receipt</span></button>
      </span>
    </span>
  );
}
