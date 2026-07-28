import { cn } from '@/lib/cn'

export interface PageHeaderProps {
  /** Small uppercase line above the title. Use sparingly. */
  eyebrow?: string
  title: string
  lead?: string
  /** Buttons or filters that belong with the title. */
  actions?: React.ReactNode
  align?: 'start' | 'center'
  className?: string
}

/**
 * The standard page title block.
 *
 * Collapses five competing header patterns. Eleven of the twelve content pages
 * already followed roughly this shape by hand; this makes it the actual
 * component so the twelfth stops drifting.
 */
export function PageHeader({
  eyebrow,
  title,
  lead,
  actions,
  align = 'start',
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-10 flex flex-col gap-5 sm:mb-12',
        actions && align === 'start' && 'sm:flex-row sm:items-end sm:justify-between',
        className
      )}
    >
      <div className={cn('max-w-prose', align === 'center' && 'mx-auto text-center')}>
        {eyebrow && (
          <p className="mb-3 text-overline uppercase text-caramel-700">{eyebrow}</p>
        )}
        <h1 className="font-serif text-h1 text-text-primary">{title}</h1>
        {lead && <p className="mt-3 text-body-lg text-text-secondary">{lead}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </div>
  )
}

export default PageHeader
