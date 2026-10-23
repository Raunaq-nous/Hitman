import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/literata";
import "@fontsource-variable/jetbrains-mono";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import AppShell from "@/components/AppShell";
import PWARegister from "@/components/PWARegister";
import { THEME_COLOR } from "@/providers/themeColor";

export const metadata: Metadata = {
  // `||` rather than `??`: an empty env var must fall back, because new URL("") throws at build time.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000"),
  title: { default: "ALTER EGO", template: "%s | ALTER EGO" },
  description:
    "A sports desk and a game in one: one brief across cricket, football, basketball, tennis and F1, and live calls at the moments that decide matches.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "ALTER EGO" },
  other: { "mobile-web-app-capable": "yes" },
};

// Zoom stays enabled: the previous viewport blocked it, which fails accessibility guidelines.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR.dark },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* apply a saved theme before first paint (no flash); falls back to the system setting */}
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('ae_theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}" }} />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <AppShell>{children}</AppShell>
          <PWARegister />
        </AuthProvider>
      </body>
    </html>
  );
}
