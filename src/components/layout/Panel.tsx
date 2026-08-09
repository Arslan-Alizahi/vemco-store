import { cn } from '@/lib/cn'

export interface PanelProps extends React.HTMLAttributes<HTMLElement> {
  /** `inverse` is the one dark panel a page is allowed. */
  tone?: 'default' | 'inverse' | 'sunken'
  /** Inner padding. `none` when the panel is filled edge to edge by an image. */
  pad?: 'none' | 'sm' | 'md' | 'lg'
  as?: 'div' | 'section' | 'article' | 'aside' | 'header' | 'footer'
}

const PAD = {
  none: '',
  sm: 'p-5 sm:p-6',
  md: 'p-6 sm:p-8',
  lg: 'p-7 sm:p-10 lg:p-14',
} as const

const TONE = {
  default: 'bg-surface text-text-primary',
  sunken: 'bg-surface-subtle text-text-primary',
  inverse: 'bg-surface-inverse text-bark-50',
} as const

/**
 * The floating card the entire layout is made of.
 *
 * The page ground is a shade darker than these panels, so a panel needs no
 * border and no shadow to read as a separate object -- the value step alone
 * does it. That is the whole reason the ground is tinted: it buys separation
 * without spending a single hairline, and a page with no hairlines on it
 * looks quiet in a way no amount of shadow tuning achieves.
 *
 * The consequence is that panels must never be nested directly inside one
 * another. Two panels of the same tone touching read as one panel with a
 * seam. Change tone, or use a gap.
 */
export function Panel({
  tone = 'default',
  pad = 'md',
  as: Tag = 'div',
  className,
  children,
  ...rest
}: PanelProps) {
  return (
    <Tag
      className={cn('overflow-hidden rounded-xl', TONE[tone], PAD[pad], className)}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/**
 * The eyebrow that labels a section: MATERIALS, FEATURED PIECES.
 *
 * A component rather than a string of utilities because it appears fourteen
 * times across the storefront, and the tracking is the part that makes it
 * work -- the first time someone writes it by hand at the default tracking,
 * the section stops matching every other section on the site.
 */
export function Eyebrow({
  children,
  tone = 'default',
  className,
  ...rest
}: React.HTMLAttributes<HTMLParagraphElement> & { tone?: 'default' | 'inverse' }) {
  return (
    <p
      className={cn(
        'text-eyebrow uppercase',
        tone === 'inverse' ? 'text-bark-300' : 'text-text-tertiary',
        className
      )}
      {...rest}
    >
      {children}
    </p>
  )
}

export default Panel
