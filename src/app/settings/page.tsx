import { pageUserId } from "@/providers/page";
import { getPreferences } from "@/domain/users/service";
import { DeleteAccount } from "./DeleteAccount";

export const metadata = { title: "Settings" };

const LANG = { en: "English", hi: "हिन्दी" } as const;

export default async function SettingsPage(): Promise<React.JSX.Element> {
  const userId = await pageUserId();
  const prefs = await getPreferences(userId);
  return (
    <main className="crew-page">
      <h1>Settings</h1>
      <section className="ui-card crew-members" aria-labelledby="prefs-h">
        <h2 id="prefs-h">Sports and language</h2>
        <p>{prefs && prefs.sports.length ? prefs.sports.join(", ") : "No sports chosen yet"} · <span lang={prefs?.language}>{LANG[prefs?.language ?? "en"]}</span></p>
        <p><a href="/onboarding?next=/settings">Change sports and language</a></p>
      </section>
      <section className="ui-card crew-members" aria-labelledby="export-h">
        <h2 id="export-h">Export my data</h2>
        <p>Download everything we hold about you as a JSON file.</p>
        <p><a href="/api/me/export" download="alter-ego-export.json" className="nav-btn">Download my data</a></p>
      </section>
      <section className="ui-card crew-members" aria-labelledby="delete-h">
        <h2 id="delete-h">Delete my account</h2>
        <DeleteAccount />
      </section>
    </main>
  );
}
