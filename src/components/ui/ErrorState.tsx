'use client'

import { AlertTriangle, RotateCw } from 'lucide-react'
import Button from './Button'
import { cn } from '@/lib/cn'

export interface ErrorStateProps {
  title?: string
  description?: string
  /** Wire this up. A failure the user cannot retry is a dead end. */
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

/**
 * Shown when a fetch fails.
 *
 * Roughly thirty fetch sites across the app catch to `console.error` and leave
 * the UI in a permanent skeleton or a false "nothing here" — the user cannot
 * tell a broken request from an empty result. This makes the failure visible
 * and recoverable.
 */
export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this just now. It is usually temporary.',
  onRetry,
  retryLabel = 'Try again',
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center px-6 py-16 text-center', className)}
    >
      <div className="mb-5 rounded-full bg-danger-50 p-4">
        <AlertTriangle className="h-6 w-6 text-danger-600" aria-hidden="true" />
      </div>
      <h3 className="mb-2 text-h3 text-text-primary">{title}</h3>
      <p className="mb-6 max-w-[46ch] text-body text-text-secondary">{description}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} leftIcon={<RotateCw className="h-4 w-4" />}>
          {retryLabel}
        </Button>
      )}
    </div>
  )
}

export default ErrorState
