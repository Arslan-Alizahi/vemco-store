import Link from 'next/link'
import { cn } from '@/lib/cn'

export interface LogoProps {
  /** `onDark` inverts for the footer and the hero. */
  tone?: 'default' | 'onDark'
  size?: 'sm' | 'md'
  href?: string | null
  className?: string
}

/**
 * One mark, one treatment.
 *
 * The header and footer previously used two different icons and two different
 * gradients, so the brand did not survive a scroll to the bottom of the page.
 */
export function Logo({ tone = 'default', size = 'md', href = '/', className }: LogoProps) {
  const content = (
    <>
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
        className={cn('shrink-0', size === 'sm' ? 'h-5 w-5' : 'h-6 w-6')}
      >
        <rect
          width="32"
          height="32"
          rx="7"
          className={tone === 'onDark' ? 'fill-caramel-400' : 'fill-caramel-700'}
        />
        <path
          d="M8 21V13.5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1V21"
          fill="none"
          strokeWidth="2.2"
          strokeLinecap="round"
          className={tone === 'onDark' ? 'stroke-bark-900' : 'stroke-canvas'}
        />
        <path
          d="M6.5 21h19M10 21v2.5M22 21v2.5"
          strokeWidth="2.2"
          strokeLinecap="round"
          className={tone === 'onDark' ? 'stroke-bark-900' : 'stroke-canvas'}
        />
      </svg>
      <span
        className={cn(
          'font-serif tracking-[-0.015em]',
          size === 'sm' ? 'text-body-lg' : 'text-h3',
          tone === 'onDark' ? 'text-white' : 'text-text-primary'
        )}
      >
        VEMCO
      </span>
    </>
  )

  const classes = cn(
    'inline-flex items-center gap-2 rounded-sm',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    tone === 'onDark' ? 'focus-visible:ring-offset-bark-900' : 'focus-visible:ring-offset-canvas',
    className
  )

  if (!href) return <span className={classes}>{content}</span>

  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  )
}

export default Logo
