"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { t } from "@/i18n";
import { LangToggle, useLang } from "./LangToggle";

const LINKS = [
  { href: "/crews", label: "nav.crews", auth: true },
  { href: "/desk", label: "nav.desk", auth: false },
  { href: "/rooms", label: "nav.rooms", auth: false },
  { href: "/roster", label: "nav.roster", auth: false },
  { href: "/commentary", label: "nav.scores", auth: false },
  { href: "/onboarding", label: "nav.how", auth: false },
] as const;

type Theme = "light" | "dark" | "system";

function ThemeToggle(): React.JSX.Element {
  // the inline script in layout.tsx has already applied any saved theme to <html data-theme>
  const [theme, setTheme] = useState<Theme>(() => (typeof document === "undefined" ? "system" : ((document.documentElement.getAttribute("data-theme") as Theme | null) ?? "system")));
  function choose(next: Theme): void {
    setTheme(next);
    if (next === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("ae_theme", next); } catch { /* storage blocked */ }
  }
  const order: Theme[] = ["system", "light", "dark"];
  const next = order[(order.indexOf(theme) + 1) % order.length];
  return (
    <button type="button" className="nav-theme" onClick={() => choose(next)} title={`Switch to ${next}`} suppressHydrationWarning>
      Theme: {theme === "dark" ? "Dark" : theme === "light" ? "Light" : "Auto"}
    </button>
  );
}

export default function Navbar(): React.JSX.Element {
  const { data: session } = useSession();
  const pathname = usePathname();
  // the menu is open only on the page where it was opened, so navigating closes it
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (v: boolean): void => setOpenOn(v ? pathname : null);
  const links = LINKS.filter((l) => !l.auth || session);
  const lang = useLang();
  return (
    <header className="appnav">
      <a className="skip-link" href="#main">{t(lang, "nav.skip")}</a>
      <div className="nav-bar">
        <Link href="/" className="nav-brand" aria-label="ALTER EGO home">
          <span className="nav-mark" aria-hidden="true"><i /><i /><i /><i /><i /></span>
          ALTER EGO
        </Link>
        <button type="button" className="nav-menu-btn" aria-expanded={open} aria-controls="nav-links" onClick={() => setOpen(!open)}>
          {t(lang, "nav.menu")}
        </button>
        <nav id="nav-links" className="nav-links" data-open={open ? "" : undefined} aria-label="Main">
          <ul>
            {links.map((l) => (
              <li key={l.href}><Link href={l.href} aria-current={pathname === l.href || pathname.startsWith(`${l.href}/`) ? "page" : undefined}>{t(lang, l.label)}</Link></li>
            ))}
          </ul>
          <div className="nav-account">
            <LangToggle />
            <ThemeToggle />
            {session ? (
              <>
                <Link href="/settings" className="nav-user">{session.user?.name}<span className="sr-only"> (settings)</span></Link>
                <button type="button" className="nav-btn" onClick={async () => { await signOut({ redirect: false }); window.location.assign("/"); }}>{t(lang, "nav.signout")}</button>
              </>
            ) : (
              <>
                <Link href="/login" className="nav-btn nav-btn-ghost">{t(lang, "nav.signin")}</Link>
                <Link href="/register" className="nav-btn">{t(lang, "nav.join")}</Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
