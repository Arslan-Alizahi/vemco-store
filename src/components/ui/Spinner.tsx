'use client'

import { cn } from '@/lib/cn'

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  /** Announced to assistive tech; also rendered when `showLabel` is set. */
  label?: string
  showLabel?: boolean
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]',
  xl: 'h-12 w-12 border-4',
}

/**
 * The single spinner implementation.
 *
 * The previous version nested one `animate-spin` inside another, so the
 * rotations compounded and it span at roughly double the intended rate. One
 * ring, one animation, with `role="status"` so a screen reader announces the
 * loading state instead of silence.
 */
export function Spinner({ size = 'md', className, label = 'Loading', showLabel }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        role="status"
        aria-label={showLabel ? undefined : label}
        className={cn(
          'animate-spin rounded-full border-border-subtle border-t-caramel-600',
          sizeClasses[size],
          className
        )}
      />
      {showLabel && <p className="text-ui text-text-secondary">{label}</p>}
    </div>
  )
}

export default Spinner

export function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn('loading-dots', className)} role="status" aria-label="Loading">
      <span />
      <span />
      <span />
    </div>
  )
}

export function FullPageSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-overlay flex items-center justify-center bg-canvas/90">
      <Spinner size="xl" label={label} showLabel />
    </div>
  )
}
