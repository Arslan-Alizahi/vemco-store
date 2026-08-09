import { cn } from '@/lib/cn'
import {
  BRAND_ADDRESS,
  BRAND_EMAIL,
  BRAND_NAME,
  BRAND_PHONES,
  BRAND_TAGLINE,
} from '@/lib/brand'

export interface PrintLetterheadProps {
  /**
   * `aside` puts the shop on the left and leaves room for a document title
   * on the right -- the statement's layout. Everything else is centred.
   */
  layout?: 'centred' | 'aside'
  className?: string
  children?: React.ReactNode
}

/**
 * The shop's name and contact details at the top of a printed document.
 *
 * One component because there are three printables -- till receipt, booking
 * bill, customer statement -- and the address was typed out separately in
 * each of them. When the shop moved, two of the three moved with it and the
 * statement went on posting customers to an address the business had left.
 * A bill is the one thing a customer keeps; the details on it have to be
 * right, and the only way to guarantee that is for there to be one of them.
 *
 * Both phone lines and the email are printed in full. Paper cannot be
 * tapped: a customer holding a bill with a problem needs every way of
 * reaching the shop spelled out, not a link.
 */
export function PrintLetterhead({
  layout = 'centred',
  className,
  children,
}: PrintLetterheadProps) {
  const shop = (
    <div className={layout === 'centred' ? 'text-center' : undefined}>
      <p className="font-serif text-h1 text-text-primary">{BRAND_NAME}</p>
      <p className="mt-1 text-ui text-text-secondary">{BRAND_TAGLINE}</p>
      <p className="mt-2 text-caption text-text-secondary">{BRAND_ADDRESS}</p>
      <p className="mt-0.5 text-caption text-text-secondary">
        {BRAND_PHONES.join(' · ')} · {BRAND_EMAIL}
      </p>
    </div>
  )

  if (layout === 'aside') {
    return (
      <header
        className={cn(
          'flex items-start justify-between gap-6 border-b border-border-strong pb-5',
          className
        )}
      >
        {shop}
        {children}
      </header>
    )
  }

  return (
    <header className={cn('border-b border-border-strong pb-5', className)}>
      {shop}
      {children}
    </header>
  )
}

export default PrintLetterhead
