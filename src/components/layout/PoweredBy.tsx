import { cn } from '@/lib/cn'

/**
 * Who built this.
 *
 * One component so the credit reads the same wherever it appears -- the shop
 * footer, the back office, and every printed bill -- rather than three
 * near-identical lines that drift apart the first time one of them is edited.
 *
 * Deliberately quiet. It sits below the shop's own copyright in the smallest
 * text on the page: a maker's mark, not a second brand competing with Vimco Furniture House
 * on Vimco Furniture House's own storefront.
 */

export const BUILDER_NAME = 'CodeChoicez'
export const BUILDER_URL = 'https://codechoicez.com/'

export function PoweredBy({
  className,
  tone = 'default',
}: {
  className?: string
  /**
   * `inverted` is for the dark storefront footer, where the ordinary
   * secondary-text colour would fall below AA against a near-black ground.
   */
  tone?: 'default' | 'inverted'
}) {
  return (
    <p className={cn('text-caption', tone === 'inverted' ? 'text-bark-300' : 'text-text-tertiary', className)}>
      Powered by{' '}
      <a
        href={BUILDER_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'underline underline-offset-4 transition-colors duration-fast',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          tone === 'inverted'
            ? 'hover:text-bark-50 focus-visible:ring-offset-surface-inverse'
            : 'hover:text-text-primary focus-visible:ring-offset-canvas'
        )}
      >
        {BUILDER_NAME}
      </a>
    </p>
  )
}

/**
 * The same credit on paper.
 *
 * A printed bill cannot be clicked, so the address is spelled out instead of
 * hidden behind a word. It is the last line on the sheet, under the shop's
 * own terms, where a maker's mark belongs.
 */
export function PoweredByPrint({ className }: { className?: string }) {
  return (
    <p className={cn('text-caption text-text-tertiary', className)}>
      Powered by {BUILDER_NAME} · codechoicez.com
    </p>
  )
}

export default PoweredBy
