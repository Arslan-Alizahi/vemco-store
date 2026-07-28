import type { Metadata } from 'next'
import Link from 'next/link'
import { Compass } from 'lucide-react'
import Button from '@/components/ui/Button'
import Container from '@/components/layout/Container'
import StorefrontShell from '@/components/layout/StorefrontShell'

export const metadata: Metadata = {
  title: 'Page not found',
}

// Reads navigation from the database for the shell.
export const dynamic = 'force-dynamic'

/**
 * A bad URL previously dropped the visitor on Next's unstyled default screen —
 * no navigation, no brand, no way back.
 *
 * This file sits outside the (storefront) route group, because Next uses it
 * for URLs that match no segment at all. It therefore mounts the shell itself
 * rather than inheriting one; a 404 with no navigation is still a dead end,
 * just a better-looking one.
 */
export default function NotFound() {
  return (
    <StorefrontShell>
      <Container size="prose" className="py-section-lg text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-surface-subtle">
          <Compass className="h-6 w-6 text-text-tertiary" aria-hidden="true" />
        </div>

        <h1 className="mb-3 font-serif text-h1 text-text-primary">We cannot find that page</h1>
        <p className="mb-8 text-body-lg text-text-secondary">
          The link may be out of date, or the piece may have sold out and been retired.
        </p>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/products">Browse furniture</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/">Go to home</Link>
          </Button>
        </div>
      </Container>
    </StorefrontShell>
  )
}
