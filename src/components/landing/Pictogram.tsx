import type { ReactNode } from "react";
import type { SportKey } from "@/content/landing";

// Grid-built sport pictograms in the spirit of Munich 1972. Decorative: always aria-hidden.
const line = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 4.2 } as const;

const SHAPES: Record<SportKey, ReactNode> = {
  cricket: (
    <>
      <g {...line}><path d="M21 14.5 23 28" /><path d="M23 28 17 37 18.5 45" /><path d="M23 28 29.5 37 32 45" /><path d="M22 18 30 22.5" /><path d="M30 22.5 41.5 9.5" strokeWidth={5.4} /></g>
      <circle cx="20.5" cy="8.6" r="4.2" fill="currentColor" /><circle cx="41" cy="31" r="2.7" fill="currentColor" />
    </>
  ),
  basketball: (
    <>
      <g {...line}><path d="M21 15 23 28" /><path d="M21.5 17.5 28 14 30 7" /><path d="M21.5 17.5 14 21" /><path d="M23 28 19 36 21 44" /><path d="M23 28 29 35 27.5 43" /></g>
      <circle cx="20" cy="9" r="4" fill="currentColor" /><circle cx="33" cy="3.9" r="3.3" fill="currentColor" />
    </>
  ),
  football: (
    <>
      <g {...line}><path d="M19.5 15 23 28.5" /><path d="M23 28.5 20.5 37.5 21.5 45" /><path d="M23 28.5 32 33.5 39 31" /><path d="M20.5 18 12 22.5" /><path d="M20.5 18 29 19.5" /></g>
      <circle cx="19" cy="8.8" r="4.2" fill="currentColor" /><circle cx="43.2" cy="36.5" r="3.3" fill="currentColor" />
    </>
  ),
  f1: (
    <g fill="currentColor">
      <path d="M5 31.5V28l4.5-1.8h9.8l2.6-3.7h7l2.6 3.7 9.8 1.4 5.2 2.4v1.5z" />
      <rect x="2.5" y="19" width="9" height="3.2" rx="1.2" /><rect x="5.4" y="21" width="3" height="7.5" />
      <circle cx="25.2" cy="20.2" r="3.4" /><circle cx="13.5" cy="33.6" r="5.4" /><circle cx="37.5" cy="33.6" r="5.4" />
    </g>
  ),
  tennis: (
    <>
      <g {...line}>
        <path d="M22.8 20 24.5 32.5" /><path d="M24.5 32.5 19.5 40 20.5 46" /><path d="M24.5 32.5 30.5 39.5 32.5 46" />
        <path d="M23 22.5 15.5 15 13.5 10.5" /><path d="M23.5 22.5 30.5 16 33 11.5" />
        <ellipse cx="35.4" cy="7.3" rx="3.2" ry="4.5" strokeWidth={3} transform="rotate(32 35.4 7.3)" />
      </g>
      <circle cx="23.5" cy="13.6" r="3.9" fill="currentColor" /><circle cx="12.2" cy="5.4" r="2.5" fill="currentColor" />
    </>
  ),
};

export function Pictogram({ sport, className }: { sport: SportKey; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      {SHAPES[sport]}
    </svg>
  );
}
