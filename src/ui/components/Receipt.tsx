import type { Receipt as ReceiptData } from "@/domain/sources/types";

const fmt = (iso: string): string => `${new Date(iso).toISOString().slice(0, 16).replace("T", " ")} UTC`;

/** The receipt affordance on a number: source, source class and when we observed it. */
export function Receipt({ receipt, children }: { receipt: ReceiptData; children?: React.ReactNode }): React.JSX.Element {
  return (
    <details className="ui-receipt">
      <summary>{children ?? `src ${receipt.sourceId}`}<span className="sr-only"> (receipt: open source details)</span></summary>
      <dl>
        <dt>Source</dt><dd>{receipt.sourceId}</dd>
        <dt>Class</dt><dd>{receipt.sourceClass.replace(/_/g, " ").toLowerCase()}</dd>
        <dt>Observed</dt><dd><time dateTime={receipt.observedAt}>{fmt(receipt.observedAt)}</time></dd>
      </dl>
    </details>
  );
}
