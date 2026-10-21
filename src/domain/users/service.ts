import type { Language, Preferences } from "./types";
import * as repo from "./repo";

export async function setPreferences(userId: string, prefs: Preferences): Promise<Preferences> {
  const r = await repo.savePreferences(userId, prefs.sports, prefs.language);
  return { sports: r.favouriteSports as Preferences["sports"], language: r.language as Language };
}

export async function getPreferences(userId: string): Promise<Preferences | null> {
  const r = await repo.loadPreferences(userId);
  return r ? { sports: r.favouriteSports as Preferences["sports"], language: r.language as Language } : null;
}
