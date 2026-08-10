import type { Metadata } from 'next'
import { Inter, Fraunces, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/lib/site'
import { ShopStructuredData, SiteStructuredData } from '@/components/layout/ShopStructuredData'

// `variable` is what makes these usable from Tailwind. Without it next/font
// self-hosts under a generated family name, so the config's `font-sans`
// pointed at an Inter that was never actually loaded.
const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const serif = Fraunces({ subsets: ['latin'], variable: '--font-serif', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })

export const metadata: Metadata = {
  /**
   * Without this, every image and canonical URL below stays relative.
   *
   * Open Graph requires absolute URLs, so a share card referenced as
   * `/opengraph-image` simply does not load: WhatsApp, Facebook and the rest
   * show a bare link with no picture and no description, which is exactly the
   * failure that is invisible from inside the site and obvious to everyone
   * the link is sent to.
   */
  metadataBase: new URL(SITE_URL),

  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,

  /**
   * What a shared link looks like.
   *
   * `openGraph.images` is left unset on purpose: Next finds
   * src/app/opengraph-image.tsx and fills it in, per route, so a product page
   * that draws its own card gets its own picture rather than the shop's
   * generic one.
   */
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: 'en_PK',
  },

  twitter: {
    // The large card, because the thing being shared is furniture. A
    // thumbnail beside a headline is the wrong shape for a photograph of a
    // sofa, and the photograph is the entire reason anybody taps.
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },

  alternates: { canonical: '/' },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Let Google use the full photograph in image search and a long enough
      // snippet to say something useful. The defaults are conservative.
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  /** Named so a browser tab and a saved bookmark say who this is. */
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,

  /** Phone numbers in body text should not become tappable links by surprise. */
  formatDetection: { telephone: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <head>
        {/* In the document a crawler is served, not injected after hydration:
            the machines that read this do not run JavaScript. */}
        <ShopStructuredData />
        <SiteStructuredData />
      </head>
      <body className="min-h-screen bg-canvas font-sans text-body text-text-primary antialiased">
        {/* MotionConfig lives in Providers, not here -- see the note there.
            The CSS-level reduced-motion guard is in globals.css. */}
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
