import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { env } from "@/providers/env";
import { DataStateBadge, SwingSeismograph, Meter, PersonaChip, Receipt, ShareCard, Stamp, TimingTowerRow } from "@/ui";
import { PERSONA_SLUGS } from "@/personas";
import { TicketDemo } from "./TicketDemo";

export const metadata: Metadata = { title: "Design system", robots: { index: false } };
export const dynamic = "force-dynamic";

// Gallery examples are illustrative component states, not data: every receipt points at "example".
const EXAMPLE = { sourceId: "example", sourceClass: "VERIFIED_DELAYED" as const, observedAt: "2026-01-01T00:00:00.000Z" };

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section aria-labelledby={id} data-testid={`gallery-${id}`} style={{ display: "grid", gap: "0.75rem" }}>
      <h2 id={id} style={{ margin: 0, font: "800 var(--step-1)/1.2 var(--font-display)" }}>{title}</h2>
      {children}
    </section>
  );
}

export default function DesignGallery(): React.JSX.Element {
  const e = env();
  if (e.NODE_ENV === "production" && !e.DESIGN_GALLERY) notFound();
  return (
    <main style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh", padding: "1.5rem 1rem 4rem", display: "grid", gap: "2rem", maxWidth: "60rem", margin: "0 auto", fontFamily: "var(--font-text)" }}>
      <header>
        <h1 style={{ margin: 0, font: "800 var(--step-3)/1.1 var(--font-display)", fontStretch: "70%" }}>ALTER EGO components</h1>
        <p style={{ color: "var(--text-2)", margin: ".4rem 0 0" }}>Development gallery. Values below are illustrative component states, not match data.</p>
      </header>
      <Section id="ticket" title="Ticket"><TicketDemo /></Section>
      <Section id="stamp" title="Stamp">
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", padding: ".5rem" }}>
          <Stamp kind="locked" /><Stamp kind="graded" /><Stamp kind="classified" /><Stamp kind="revealed" /><Stamp kind="coin-flip" />
        </div>
      </Section>
      <Section id="receipt" title="Receipt"><p style={{ margin: 0 }}>Run rate <b className="tabular">7.97</b> <Receipt receipt={EXAMPLE} /></p></Section>
      <Section id="meter" title="Leverage Meter">
        <div style={{ display: "grid", gap: "1rem", maxWidth: "24rem" }}>
          <Meter label="Leverage" value={0.2} valueText="Low (p20)" />
          <Meter label="Leverage" value={0.9} valueText="Very high (p90)" />
        </div>
      </Section>
      <Section id="seismograph" title="Swing Seismograph">
        <SwingSeismograph title="Illustrative trace (not match data)" points={[{ t: 0, wp: 0.5 }, { t: 1, wp: 0.54 }, { t: 2, wp: 0.31 }, { t: 3, wp: 0.36 }, { t: 4, wp: 0.62 }, { t: 5, wp: 0.58 }]} ghost={[{ t: 2, wp: 0.31 }, { t: 3, wp: 0.42 }, { t: 4, wp: 0.47 }, { t: 5, wp: 0.5 }]} />
      </Section>
      <Section id="tower" title="Timing Tower row">
        <ol className="ui-tower">
          <TimingTowerRow entry={{ rank: 1, name: "Example fan A", readRating: 1288, brier: 0.182, callsThisWeek: 9, form: ["good", "good", "poor", "good", "none"], change: 2 }} />
          <TimingTowerRow entry={{ rank: 2, name: "Example fan B", readRating: 1241, brier: null, callsThisWeek: 3, form: ["poor", "good", "none"], change: -1 }} />
        </ol>
      </Section>
      <Section id="persona" title="Persona Chip">
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>{PERSONA_SLUGS.map((p) => <PersonaChip key={p} persona={p} />)}</div>
      </Section>
      <Section id="badge" title="Data-state badge">
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          <DataStateBadge state="historical-replay" label="Historical replay" />
          <DataStateBadge state="delayed" label="Delayed" />
          <DataStateBadge state="stale" label="Stale · 3 min" />
          <DataStateBadge state="source-pending" label="Source pending" />
        </div>
      </Section>
      <Section id="share" title="Share card"><ShareCard displayName="Example fan" title="Called it: pace for the 19th" grade="+6.2 pts" moment="Example moment" /></Section>
    </main>
  );
}
