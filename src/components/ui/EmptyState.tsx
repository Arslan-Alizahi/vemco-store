'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  /** Primary way out. An empty state without one is a dead end. */
  action?: React.ReactNode
  secondaryAction?: React.ReactNode
  className?: string
}

/**
 * Shown when a list has nothing in it.
 *
 * Always give the user somewhere to go. The product grid previously rendered
 * a bare "No products found" line with no way to clear the filter that caused
 * it, so a bad search left the shopper stuck.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-16 text-center', className)}>
      {Icon && (
        <div className="mb-5 rounded-full bg-surface-subtle p-4">
          <Icon className="h-6 w-6 text-text-tertiary" aria-hidden="true" />
        </div>
      )}
      <h3 className="mb-2 text-h3 text-text-primary">{title}</h3>
      {description && (
        <p className="mb-6 max-w-[46ch] text-body text-text-secondary">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="flex flex-col gap-3 sm:flex-row">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}

export default EmptyState
