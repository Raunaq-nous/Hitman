export const metadata = { title: "Privacy" };

export default function PrivacyPage(): React.JSX.Element {
  return (
    <main className="crew-page legal">
      <h1>Privacy notice</h1>
      <p className="crew-lead">Draft for legal review · beta</p>
      <h2>What we store</h2>
      <ul>
        <li><b>Account:</b> display name, email address and a bcrypt hash of your password (never the password itself).</li>
        <li><b>Preferences:</b> favourite sports and language.</li>
        <li><b>Calls and ratings:</b> the calls you make, their grades and your rating history (when the Decision Lab opens).</li>
        <li><b>Crews:</b> the crews you own or belong to, reports you make, and people you block.</li>
        <li><b>Product analytics:</b> events such as viewing a moment or opening a receipt, linked to your account, without free text.</li>
      </ul>
      <h2>Why</h2>
      <p>To run the service, keep crews private and safe, and measure whether the product helps people make better reads. We don’t sell personal data and we don’t show ads.</p>
      <h2>AI</h2>
      <p>When AI phrasing is enabled, the model receives verified sports facts only, never your email, password or other personal data.</p>
      <h2>Retention</h2>
      <p>We keep your data while your account exists. When you delete your account, your account, preferences, crew memberships, reports, blocks, teams and analytics events are deleted straight away; crews you own are handed to the longest-standing member or deleted if you were the only one.</p>
      <h2>Your rights</h2>
      <p>Export everything we hold about you as JSON, or delete your account, from <a href="/settings">settings</a>.</p>
    </main>
  );
}
