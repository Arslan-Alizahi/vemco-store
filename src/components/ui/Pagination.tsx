'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
  className?: string
}

/**
 * Builds a windowed page list: first, last, the current page and one either
 * side, with gaps marked by null.
 *
 * The old control rendered one button per page with no truncation and no
 * wrapping, so a catalogue of any size pushed the row off the viewport.
 */
const buildWindow = (page: number, total: number): (number | null)[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages = new Set<number>([1, total, page])
  if (page - 1 > 1) pages.add(page - 1)
  if (page + 1 < total) pages.add(page + 1)

  const sorted = Array.from(pages).sort((a, b) => a - b)
  const withGaps: (number | null)[] = []

  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) withGaps.push(null)
    withGaps.push(value)
  })

  return withGaps
}

export function Pagination({ page, totalPages, onChange, className }: PaginationProps) {
  if (totalPages <= 1) return null

  const items = buildWindow(page, totalPages)

  const arrow =
    'flex h-11 w-11 items-center justify-center rounded-sm border border-border-subtle text-text-secondary transition-colors duration-fast hover:bg-surface-subtle hover:text-text-primary disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <nav aria-label="Pagination" className={cn('flex items-center justify-center gap-2', className)}>
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={arrow}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>

      <ul className="flex items-center gap-1">
        {items.map((value, index) =>
          value === null ? (
            <li
              key={`gap-${index}`}
              aria-hidden="true"
              className="px-1 text-ui text-text-tertiary"
            >
              &hellip;
            </li>
          ) : (
            <li key={value}>
              <button
                type="button"
                onClick={() => onChange(value)}
                aria-label={`Page ${value}`}
                aria-current={value === page ? 'page' : undefined}
                className={cn(
                  'flex h-11 min-w-11 items-center justify-center rounded-sm px-3 text-ui font-medium tabular-nums',
                  'transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  value === page
                    ? 'bg-caramel-600 text-white'
                    : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
                )}
              >
                {value}
              </button>
            </li>
          )
        )}
      </ul>

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className={arrow}
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  )
}

export default Pagination
