import Link from 'next/link'
import { cn } from '@/lib/cn'
import { BRAND_MARK, BRAND_NAME } from '@/lib/brand'

export interface LogoProps {
  /** `onDark` inverts for the footer and the one dark panel. */
  tone?: 'default' | 'onDark'
  size?: 'sm' | 'md'
  href?: string | null
  className?: string
}

/**
 * A wordmark, not a logo.
 *
 * The sofa glyph that used to sit here was doing the one job the word does
 * better: at 24px it read as a rounded rectangle, and next to product
 * photography of actual sofas it was a drawing of a thing the page was
 * already showing. Furniture houses have signed their name for two hundred
 * years and the name is the mark.
 *
 * The lockup is two lines because the shop is called three words. Set on one
 * line it either shrinks below legibility in the header or eats the nav;
 * stacked, the large word carries at a glance and the small line tells you
 * what kind of shop it is -- which is exactly the job a signboard does.
 */
export function Logo({ tone = 'default', size = 'md', href = '/', className }: LogoProps) {
  const onDark = tone === 'onDark'

  const content = (
    <span className="flex flex-col">
      <span
        className={cn(
          'font-serif font-normal leading-none',
          // Steps down on a phone. At the desktop size the wordmark took
          // more than half the width of a 375px header, which on the one
          // screen where space is scarce spends it on the one thing the
          // visitor already knows -- whose shop they are in.
          size === 'sm'
            ? 'text-h3 tracking-[0.06em] sm:text-h2'
            : 'text-h2 tracking-[0.07em] sm:text-h1',
          onDark ? 'text-bark-50' : 'text-text-primary'
        )}
      >
        {BRAND_MARK.top}
      </span>
      <span
        className={cn(
          'text-eyebrow mt-1 uppercase',
          onDark ? 'text-bark-300' : 'text-text-tertiary'
        )}
      >
        {BRAND_MARK.bottom}
      </span>
    </span>
  )

  const classes = cn(
    'inline-flex rounded-sm',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    onDark ? 'focus-visible:ring-offset-surface-inverse' : 'focus-visible:ring-offset-canvas',
    className
  )

  // The accessible name is the shop's real name, not the two stacked
  // fragments a screen reader would otherwise read as "VIMO, FURNITURE
  // HOUSE" with a pause in the middle of the business's name.
  if (!href)
    return (
      <span className={classes} aria-label={BRAND_NAME} role="img">
        {content}
      </span>
    )

  return (
    <Link href={href} className={classes} aria-label={`${BRAND_NAME} — home`}>
      {content}
    </Link>
  )
}

export default Logo
