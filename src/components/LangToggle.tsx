"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { isLang, LANG_COOKIE, t, type Lang } from "@/i18n";

// the language lives in the ae_lang cookie; components re-read it when the toggle changes it
const listeners = new Set<() => void>();
function readLang(): Lang {
  const m = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`));
  return m && isLang(m[1]) ? m[1] : "en";
}
function subscribe(cb: () => void): () => void { listeners.add(cb); return () => { listeners.delete(cb); }; }

/** The current language on the client (English during server rendering). */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, readLang, () => "en" as Lang);
}

/** Split-flap language toggle: EN ⇄ हि. Persists to the cookie (and the account when signed in). */
export function LangToggle(): React.JSX.Element {
  const lang = useLang();
  const router = useRouter();
  async function flip(): Promise<void> {
    const next: Lang = lang === "en" ? "hi" : "en";
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    listeners.forEach((l) => l());
    await fetch("/api/me/language", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: next }) }).catch(() => undefined);
    router.refresh();
  }
  return (
    <button type="button" className="nav-lang" data-testid="lang-toggle" onClick={flip}>
      <span className="flap" key={lang} lang={lang}>{lang === "en" ? "EN" : "हि"}</span>
      <span className="sr-only">: {t(lang, "lang.switch")}</span>
    </button>
  );
}
