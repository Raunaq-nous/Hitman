import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AuthProvider from '@/components/AuthProvider'
import Navbar from '@/components/Navbar'
import PWARegister from '@/components/PWARegister'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://hitman-drab.vercel.app'),
  title: 'HITMAN | Fantasy Cricket League',
  description: 'Build your ultimate fantasy cricket team, create private leagues, invite friends, and compete for the top payout pool. Real-time live scores from CricketData.org included.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'HITMAN',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  themeColor: '#dc2626',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
      </head>
      <body className={`${inter.className} bg-black text-gray-100 min-h-screen flex flex-col antialiased selection:bg-red-600 selection:text-white`}>
        <AuthProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
            {children}
          </main>
          <PWARegister />
        </AuthProvider>
      </body>
    </html>
  )
}
