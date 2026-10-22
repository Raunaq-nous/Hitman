"use client";

import { useId, useRef, useState } from "react";
import type { Receipt as ReceiptData } from "@/domain/sources/types";

const fmt = (iso: string): string => `${new Date(iso).toISOString().slice(0, 16).replace("T", " ")} UTC`;

/**
 * The receipt drawer on a number: source, source class, when we observed it and the source's attribution.
 * A button opens it; Escape closes it and returns focus to the button.
 */
export interface ReceiptLabels { source: string; class: string; observed: string; attribution: string; close: string; region: string }
const EN: ReceiptLabels = { source: "Source", class: "Class", observed: "Observed", attribution: "Attribution", close: "Close", region: "Receipt" };

export function Receipt({ receipt, attribution, details, labels = EN, children }: { receipt: ReceiptData; attribution?: string; details?: string[]; labels?: ReceiptLabels; children?: React.ReactNode }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const close = (): void => { setOpen(false); button.current?.focus(); };
  return (
    <span className="ui-receipt" data-open={open}>
      <button ref={button} type="button" className="ui-receipt-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        {children ?? `src ${receipt.sourceId}`}<span className="sr-only"> (receipt: source details)</span>
      </button>
      <span id={id} role="region" aria-label={labels.region} className="ui-receipt-drawer" hidden={!open} onKeyDown={(e) => { if (e.key === "Escape") close(); }}>
        <dl>
          <dt>{labels.source}</dt><dd>{receipt.sourceId}</dd>
          <dt>{labels.class}</dt><dd>{receipt.sourceClass.replace(/_/g, " ").toLowerCase()}</dd>
          <dt>{labels.observed}</dt><dd><time dateTime={receipt.observedAt}>{fmt(receipt.observedAt)}</time></dd>
          {attribution && <><dt>{labels.attribution}</dt><dd>{attribution}</dd></>}
        </dl>
        {details?.map((d, i) => <span key={i} className="ui-receipt-detail">{d}</span>)}
        <button type="button" className="ui-receipt-close" onClick={close}>{labels.close}<span className="sr-only"> ({labels.region})</span></button>
      </span>
    </span>
  );
}
