"use client";

export function PrintButton(): React.JSX.Element {
  return <button type="button" className="lab-btn sf-noprint" onClick={() => window.print()}>Print or save as PDF</button>;
}
