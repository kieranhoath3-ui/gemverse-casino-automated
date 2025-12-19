import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/providers/auth-provider'
import { ToastProvider } from '@/components/providers/toast-provider'

export const metadata: Metadata = {
  title: 'Gemverse Casino - Free-to-Play Gem-Only Metaverse',
  description: '100% Free-to-Play, Gem-Only, Simulated-Gambling Metaverse. No real money transactions - gems only, forever.',
  keywords: 'casino, gems, free, simulated gambling, metaverse, games',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <AuthProvider>
          <ToastProvider>
            <div className="casino-bg">
              {children}
            </div>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}