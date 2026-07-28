'use client'

import { cn } from '@/lib/cn'
import { formatAmount, formatCurrency } from '@/lib/utils'

export interface MoneyProps extends React.HTMLAttributes<HTMLSpanElement> {
  amount: number
  /** Drop the Rs prefix where a column header already carries the unit. */
  bare?: boolean
  /** Struck through, for a compare-at price. */
  strike?: boolean
}

/**
 * Renders an amount in PKR.
 *
 * Always `tabular-nums`, so figures line up in a column instead of jittering
 * — the app is a storefront with a register and a revenue dashboard, and it
 * had zero uses of tabular figures. Routing every amount through here also
 * makes it impossible to reintroduce a hardcoded currency symbol, which is
 * how the product page ended up showing dollars after the PKR switch.
 */
export function Money({ amount, bare, strike, className, ...props }: MoneyProps) {
  return (
    <span
      className={cn(
        'tabular-nums',
        strike && 'text-text-tertiary line-through',
        className
      )}
      {...props}
    >
      {bare ? formatAmount(amount) : formatCurrency(amount)}
    </span>
  )
}

export interface NumericProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number
}

/** Plain figures — quantities, counts, stock levels. */
export function Numeric({ value, className, ...props }: NumericProps) {
  return (
    <span className={cn('tabular-nums', className)} {...props}>
      {formatAmount(value)}
    </span>
  )
}

export default Money
