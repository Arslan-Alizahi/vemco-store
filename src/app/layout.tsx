import type { Metadata } from 'next'
import { Inter, Fraunces, JetBrains_Mono } from 'next/font/google'
import { MotionConfig } from 'framer-motion'
import './globals.css'
import { ToastProvider } from '@/components/ui/Toast'

// `variable` is what makes these usable from Tailwind. Without it next/font
// self-hosts under a generated family name, so the config's `font-sans`
// pointed at an Inter that was never actually loaded.
const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const serif = Fraunces({ subsets: ['latin'], variable: '--font-serif', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })

export const metadata: Metadata = {
  title: {
    default: 'ModernStore — Furniture for considered spaces',
    // Pages supply their own title in Phase 4; until then this template is
    // inert. All 24 routes currently share one title.
    template: '%s — ModernStore',
  },
  description:
    'Furniture built to last, photographed honestly, and priced without theatre.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-canvas font-sans text-body text-text-primary antialiased">
        {/* Covers every framer-motion animation in the app in one line. The
            CSS-level guard lives in globals.css. */}
        <MotionConfig reducedMotion="user">
          <ToastProvider>{children}</ToastProvider>
        </MotionConfig>
      </body>
    </html>
  )
}
