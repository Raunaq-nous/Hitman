import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import AppShell from "@/components/AppShell";
import PWARegister from "@/components/PWARegister";

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
    { media: "(prefers-color-scheme: light)", color: "#F5F7FA" },
    { media: "(prefers-color-scheme: dark)", color: "#0C1626" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&display=swap" />
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
