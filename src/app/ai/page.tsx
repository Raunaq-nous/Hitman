export const metadata = { title: "How AI is used" };

export default function AiPage(): React.JSX.Element {
  return (
    <main className="crew-page legal">
      <h1>How ALTER EGO uses AI</h1>
      <h2>Facts first, models second, language third</h2>
      <p>Scores, win probability, leverage, grades and ratings are calculated by deterministic code with tests. AI never calculates them.</p>
      <h2>The analysts are AI</h2>
      <p>The Opener, The Closer, The Architect, The Professor and The Iceman are original AI characters. They are labelled “AI analyst” wherever they speak. They are not real people and do not imitate any athlete.</p>
      <h2>Receipts and the claim verifier</h2>
      <p>Everything an analyst says is a list of typed claims (observed, derived, model estimate or editorial) with sources. Before anything is shown, a verifier checks that every number appears in the cited facts, that nothing comes from after the moment being discussed, and that there is no talk of money or betting. If a check fails we show a plain, pre-written sentence instead.</p>
      <p>When no AI key is configured, all text comes from those pre-written templates.</p>
      <h2>Report an error</h2>
      <p>If a number or sentence looks wrong, use the receipt to see its source, then tell us through the report option in your crew or by contacting the team listed in the app store page. We correct facts by adding a new, superseding record; we never quietly edit history.</p>
    </main>
  );
}
