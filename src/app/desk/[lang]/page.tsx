import { DataStateBadge, Receipt } from "@/ui";
import { DEPTHS, deskBrief, phraseItem } from "@/domain/desk/service";
import { storyTitle } from "@/domain/stories/service";
import { notFound } from "next/navigation";
import { isLang, LANGS, t, type MessageKey } from "@/providers/i18n";
import { DepthProvider, DepthText } from "../DepthSwitch";
import "../desk.css";

export const metadata = { title: "The Desk" };

// one prerendered page per language; src/proxy.ts rewrites /desk to the reader's language
export const dynamicParams = false;
export function generateStaticParams(): { lang: string }[] {
  return LANGS.map((lang) => ({ lang }));
}

const pts = (x: number): number => Math.round(x * 100);

export default async function DeskPage({ params }: { params: Promise<{ lang: string }> }): Promise<React.JSX.Element> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const m = (key: MessageKey, vars?: Record<string, string | number>): string => t(lang, key, vars);
  const sport = (s: string): string => m(`sport.${s}` as MessageKey);
  const labels = { source: m("receipt.source"), class: m("receipt.class"), observed: m("receipt.observed"), attribution: m("receipt.attribution"), close: m("receipt.close"), region: m("receipt.region") };
  const { items, pending } = deskBrief();
  // every depth, verified, for every item: the switch only chooses which one to show
  const texts = await Promise.all(items.map(async (it) => Object.fromEntries(await Promise.all(DEPTHS.map(async (d) => [d, (await phraseItem(it, d, lang)).claims.claims.map((c) => c.text)] as const)))));
  return (
    <main className="crew-page" lang={lang}>
      <header>
        <h1>{m("desk.title")}</h1>
        <p className="crew-lead">{m("desk.lead")}</p>
      </header>
      <DepthProvider labels={{ legend: m("desk.depth"), quick: m("depth.quick"), tactical: m("depth.tactical"), analyst: m("depth.analyst") }}>
        <ol className="desk-items" data-testid="desk-items">
          {items.map((it, n) => (
            <li key={it.id} className="ui-card desk-item" data-testid="desk-item" data-sport={it.sport} data-swing={it.swing?.value ?? ""}>
              <div className="desk-head">
                <span className="desk-sport">{sport(it.sport)} · <span lang="en">{it.competition} {it.season}</span></span>
                <DataStateBadge state="historical-replay" label={m("desk.replay")} />
              </div>
              <h2 className="desk-name" lang="en">{it.name}</h2>
              <DepthText texts={texts[n] as Parameters<typeof DepthText>[0]["texts"]} />
              {it.swing ? (
                <div className="desk-swing">
                  <span className="desk-swing-value" data-testid="swing">{m("desk.swing", { pts: pts(it.swing.value) })}</span>
                  <span className="desk-swing-note tabular">{m("desk.swingNote", { team: it.swing.team, from: pts(it.swing.from), to: pts(it.swing.to) })}</span>
                  <Receipt receipt={it.swing.receipt} attribution={it.attribution} details={[it.swing.model]} labels={labels}>{m("receipt")}</Receipt>
                </div>
              ) : (
                <p className="desk-swing-note" data-testid="swing-none">{m("desk.notModelled")} {it.swingReason && m(`desk.reason.${it.swingReason}`)}</p>
              )}
              <ul className="desk-stories" aria-label={m("desk.storiesFrom", { name: it.name })}>
                {it.stories.map((s) => (
                  <li key={`${s.kind}:${s.receipts[0]}`} data-testid="story">
                    {storyTitle(s, lang)}{" "}
                    <Receipt receipt={s.receipt} attribution={it.attribution} labels={labels}
                      details={[m("receipt.incidents", { list: s.receipts.slice(0, 6).join(", ") }) + (s.receipts.length > 6 ? m("receipt.more", { n: s.receipts.length - 6 }) : "")]}>{m("receipt")}</Receipt>
                  </li>
                ))}
              </ul>
              <p className="desk-attr" lang="en">{it.attribution}</p>
            </li>
          ))}
        </ol>
      </DepthProvider>
      {pending.length > 0 && (
        <section className="ui-card desk-pending" aria-labelledby="pending-h" data-testid="desk-pending">
          <h2 id="pending-h">{m("desk.pendingTitle")}</h2>
          <ul>
            {pending.map((p) => (
              <li key={p.sport}>
                <DataStateBadge state="source-pending" label={m("desk.pending")} /> <b>{sport(p.sport)}</b>:{" "}
                {p.refused ? m("desk.pending.unusable", { reason: p.reason }) : p.sport === "basketball" || p.sport === "tennis" ? m(`pending.${p.sport}`) : p.reason}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
