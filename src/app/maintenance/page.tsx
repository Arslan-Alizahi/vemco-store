import type { Metadata } from 'next'
import Logo from '@/components/layout/Logo'

/**
 * Shown in place of the whole site while MAINTENANCE_MODE is on.
 *
 * Deliberately self-contained: no database, no API call, no client
 * JavaScript. The one page that has to work when something else does not
 * cannot depend on anything that might be the reason it is up.
 */
export const metadata: Metadata = {
  title: 'Back soon',
  description: 'The Vimco Furniture House store is temporarily unavailable for maintenance.',
  // Belt and braces alongside the 503 the middleware sends: a maintenance
  // page must never be indexed in place of the real shop.
  robots: { index: false, follow: false },
}

export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-5 py-section-md">
      <div className="w-full max-w-prose text-center">
        <div className="flex justify-center">
          <Logo href={null} />
        </div>

        <hr className="mx-auto my-8 w-24 border-t border-border-strong" />

        <h1 className="font-serif text-h1 text-text-primary sm:text-display">
          We&rsquo;ll be back soon
        </h1>

        <p className="mx-auto mt-5 max-w-[38ch] text-body-lg text-text-secondary">
          Our store is temporarily under maintenance. Please check back later.
        </p>

        <p className="mt-10 text-ui text-text-secondary">
          Need something in the meantime?{' '}
          <a
            href="mailto:hj680787@gmail.com"
            className="underline underline-offset-4 hover:text-text-primary"
          >
            hj680787@gmail.com
          </a>{' '}
          &middot;{' '}
          <a
            href="tel:+923009125757"
            className="whitespace-nowrap underline underline-offset-4 hover:text-text-primary"
          >
            +92 300 9125757
          </a>
        </p>
      </div>
    </main>
  )
}
