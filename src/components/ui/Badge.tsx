'use client'

import { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-xs font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-caramel-100 text-caramel-900',
        secondary: 'bg-surface-subtle text-text-secondary',
        success: 'bg-success-100 text-success-900',
        warning: 'bg-warning-100 text-warning-900',
        danger: 'bg-danger-100 text-danger-900',
        sale: 'bg-sage-100 text-sage-900',
        outline: 'border border-border-subtle bg-transparent text-text-secondary',
      },
      size: {
        sm: 'px-1.5 py-0.5 text-overline uppercase',
        md: 'px-2 py-0.5 text-caption',
        lg: 'px-2.5 py-1 text-ui',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export default function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

export function StatusBadge({ status }: { status: string }) {
  const variant = (() => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'completed':
      case 'paid':
      case 'delivered':
        return 'success'
      case 'pending':
      case 'processing':
        return 'warning'
      case 'inactive':
      case 'cancelled':
      case 'failed':
      case 'refunded':
        return 'danger'
      default:
        return 'secondary'
    }
  })()

  return <Badge variant={variant}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
}

/**
 * Healthy stock gets no badge at all.
 *
 * Labelling every product "In Stock (47)" spends attention on the default
 * case and leaves nothing louder for the cases that actually need it.
 */
export function StockBadge({ quantity, threshold = 5 }: { quantity: number; threshold?: number }) {
  if (quantity > threshold) return null

  return quantity <= 0 ? (
    <Badge variant="danger">Out of stock</Badge>
  ) : (
    <Badge variant="warning">Only {quantity} left</Badge>
  )
}

export { Badge, badgeVariants }
