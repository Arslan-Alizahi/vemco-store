import type { Metadata } from 'next'
import { Inter, Fraunces, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

// `variable` is what makes these usable from Tailwind. Without it next/font
// self-hosts under a generated family name, so the config's `font-sans`
// pointed at an Inter that was never actually loaded.
const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const serif = Fraunces({ subsets: ['latin'], variable: '--font-serif', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })

export const metadata: Metadata = {
  title: {
    default: 'VEMCO — Furniture for considered spaces',
    // Pages supply their own title in Phase 4; until then this template is
    // inert. All 24 routes currently share one title.
    template: '%s — VEMCO',
  },
  description:
    'Furniture built to last, photographed honestly, and priced without theatre.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-canvas font-sans text-body text-text-primary antialiased">
        {/* MotionConfig lives in Providers, not here -- see the note there.
            The CSS-level reduced-motion guard is in globals.css. */}
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
