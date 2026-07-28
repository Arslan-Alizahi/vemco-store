'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCw } from 'lucide-react'
import Button from '@/components/ui/Button'
import Container from '@/components/layout/Container'

/**
 * Route-level error boundary.
 *
 * `reset` re-renders the segment, which recovers from a transient failure
 * without a full page load. The digest is surfaced deliberately: it is the
 * only handle a customer can quote to support, and the message itself is
 * never shown because it can carry server internals.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Route error:', error)
  }, [error])

  return (
    <Container size="prose" className="py-section-lg text-center">
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-danger-50">
        <AlertTriangle className="h-6 w-6 text-danger-600" aria-hidden="true" />
      </div>

      <h1 className="mb-3 font-serif text-h1 text-text-primary">Something went wrong</h1>
      <p className="mb-8 text-body-lg text-text-secondary">
        This is on us, not you. Trying again usually works.
      </p>

      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <Button size="lg" onClick={reset} leftIcon={<RotateCw className="h-4 w-4" />}>
          Try again
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/">Go to home</Link>
        </Button>
      </div>

      {error.digest && (
        <p className="mt-8 font-mono text-caption text-text-tertiary">
          Reference: {error.digest}
        </p>
      )}
    </Container>
  )
}
