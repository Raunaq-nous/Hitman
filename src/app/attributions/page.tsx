import { listPolicies } from "@/providers/rights";

export const metadata = { title: "Attributions" };

/** Generated from the rights policies in src/rights/policies (the same files that gate storage and display). */
export default function AttributionsPage(): React.JSX.Element {
  const policies = listPolicies();
  return (
    <main className="crew-page legal">
      <h1>Data sources and attributions</h1>
      <p className="crew-lead">Every source we use, with its attribution and what our licence notes allow.</p>
      {policies.map((p) => (
        <section key={p.source_id} className="ui-card crew-members" aria-labelledby={`src-${p.source_id}`}>
          <h2 id={`src-${p.source_id}`}>{p.display_name}</h2>
          <p><b>{p.attribution_text}</b></p>
          <dl className="roster-dl">
            <dt>Shown in the app</dt><dd>{p.may_display_raw ? "Yes" : "No"}</dd>
            <dt>Stored as history</dt><dd>{p.may_store_history ? "Yes" : "No"}</dd>
            <dt>Used to fit models</dt><dd>{p.may_train_models ? "Yes" : "No"}</dd>
            <dt>Prototype only</dt><dd>{p.prototype_only ? "Yes, off in production builds" : "No"}</dd>
            <dt>Commercial use</dt><dd>{p.commercial_use === "yes" ? "Confirmed" : p.commercial_use === "no" ? "Not allowed" : "Not yet confirmed"}</dd>
          </dl>
          <p className="roster-note">{p.notes}</p>
        </section>
      ))}
      <p className="roster-note">Fonts: Archivo, Literata and JetBrains Mono under the SIL Open Font License, self-hosted via Fontsource.</p>
    </main>
  );
}
