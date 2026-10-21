export const metadata = { title: "Terms" };

export default function TermsPage(): React.JSX.Element {
  return (
    <main className="crew-page legal">
      <h1>Terms of use</h1>
      <p className="crew-lead">Draft for legal review · beta</p>
      <h2>Free to play</h2>
      <p>ALTER EGO is free. There are no deposits, entry fees, cash, prizes, vouchers or rewards of value of any kind, including from sponsors. Ratings, grades and standings are for fun and bragging rights between friends only, and have no monetary value.</p>
      <h2>Who can use it</h2>
      <p>The beta is open to people aged 18 and over. You confirm your age when you sign up.</p>
      <h2>Acceptable use</h2>
      <ul>
        <li>Be respectful in crews. Don’t harass, threaten, impersonate or spam other people.</li>
        <li>Don’t try to break, scrape or overload the service, or to get around rate limits or access controls.</li>
        <li>Don’t use ALTER EGO for gambling or to organise any money game around it.</li>
      </ul>
      <p>Crew owners can remove members, and anyone can report or block someone. We may suspend accounts that break these rules.</p>
      <h2>Data and analysis</h2>
      <p>Sports data comes from the sources listed on the <a href="/attributions">attributions</a> page. Analysis is produced by deterministic models; AI analysts only phrase verified facts and are labelled as AI. Model estimates are estimates, not guarantees.</p>
      <h2>Your account</h2>
      <p>You can export or delete your data at any time from <a href="/settings">settings</a>. See the <a href="/privacy">privacy notice</a>.</p>
    </main>
  );
}
