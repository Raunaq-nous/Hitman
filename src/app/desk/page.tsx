import { DataStateBadge, Receipt } from "@/ui";
import { deskBrief } from "@/domain/desk/service";
import "./desk.css";

export const metadata = { title: "The Desk" };

const SPORT: Record<string, string> = { cricket: "Cricket", football: "Football", f1: "Formula 1", basketball: "Basketball", tennis: "Tennis" };
const pts = (x: number): string => `${Math.round(x * 100)}`;

export default function DeskPage(): React.JSX.Element {
  const { items, pending } = deskBrief();
  return (
    <main className="crew-page">
      <header>
        <h1>The Desk</h1>
        <p className="crew-lead">Recorded matches from every sport we hold data for, ranked by swing: how far one passage of play moved the win probability. Every number opens its receipt.</p>
      </header>
      <ol className="desk-items" data-testid="desk-items">
        {items.map((it) => (
          <li key={it.id} className="ui-card desk-item" data-testid="desk-item" data-sport={it.sport} data-swing={it.swing?.value ?? ""}>
            <div className="desk-head">
              <span className="desk-sport">{SPORT[it.sport]} · {it.competition} {it.season}</span>
              <DataStateBadge state="historical-replay" label="Historical replay" />
            </div>
            <h2 className="desk-name">{it.name}</h2>
            {it.swing ? (
              <div className="desk-swing">
                <span className="desk-swing-value" data-testid="swing">Swing {pts(it.swing.value)} pts</span>
                <span className="desk-swing-note tabular">{it.swing.team} win probability {pts(it.swing.from)}% → {pts(it.swing.to)}% over six balls</span>
                <Receipt receipt={it.swing.receipt}>receipt</Receipt>
                <p className="desk-model">{it.swing.model}</p>
              </div>
            ) : (
              <p className="desk-swing-note" data-testid="swing-none">Swing: not modelled. {it.swingReason}</p>
            )}
            <ul className="desk-stories" aria-label={`Stories from ${it.name}`}>
              {it.stories.map((s) => (
                <li key={`${s.kind}:${s.receipts[0]}`} data-testid="story">
                  {s.title} <Receipt receipt={s.receipt}>receipt</Receipt>
                </li>
              ))}
            </ul>
            <p className="desk-attr">{it.attribution}</p>
          </li>
        ))}
      </ol>
      {pending.length > 0 && (
        <section className="ui-card desk-pending" aria-labelledby="pending-h" data-testid="desk-pending">
          <h2 id="pending-h">Source pending</h2>
          <ul>
            {pending.map((p) => <li key={p.sport}><DataStateBadge state="source-pending" label="Source pending" /> <b>{SPORT[p.sport]}</b>: {p.reason}</li>)}
          </ul>
        </section>
      )}
    </main>
  );
}
