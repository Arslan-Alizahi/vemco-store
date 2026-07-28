'use client'

import { cn } from '@/lib/cn'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Loading placeholder.
 *
 * The `.skeleton` utility is a shimmer sweep. It used to rely on
 * `animate-pulse`, which a bare `@keyframes pulse` in globals.css was
 * silently overriding with an expanding red ring -- so the product grid
 * opened with twelve pulsing error halos.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div className={cn('skeleton', className)} aria-hidden="true" {...props} />
}

/**
 * Product card placeholder.
 *
 * Geometry is derived from the same tokens as the real card -- 4:5 media,
 * `md` radius, `p-5` body -- so the layout does not shift when content
 * arrives.
 */
export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-md bg-surface shadow-e0" aria-hidden="true">
      <Skeleton className="aspect-[4/5] w-full rounded-none" />
      <div className="p-5">
        <Skeleton className="mb-2 h-5 w-3/4" />
        <Skeleton className="mb-1.5 h-4 w-full" />
        <Skeleton className="mb-4 h-4 w-2/3" />
        <Skeleton className="h-6 w-28" />
      </div>
    </div>
  )
}

/** A run of text lines, for prose and table cells. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-4', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}

export default Skeleton
