import { cn } from '@/lib/cn'

export interface AppFrameProps {
  header?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  className?: string
  mainClassName?: string
}

/**
 * Skip link, landmarks, and the main content region.
 *
 * The app had zero `<main>` elements and no skip link on any of its 24 routes,
 * so a keyboard or screen-reader user had to tab through the entire header on
 * every page with nothing to jump to.
 *
 * The skip link is visually hidden until focused, which is the point -- it is
 * the first thing in the tab order and the first thing a keyboard user meets.
 */
export function AppFrame({
  header,
  footer,
  children,
  className,
  mainClassName,
}: AppFrameProps) {
  return (
    <div className={cn('flex min-h-screen flex-col bg-canvas', className)}>
      <a
        href="#content"
        className={cn(
          'sr-only rounded-sm bg-caramel-700 px-4 py-2 text-ui font-medium text-white',
          'focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-tooltip',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-canvas'
        )}
      >
        Skip to content
      </a>

      {header}

      <main id="content" tabIndex={-1} className={cn('flex-1 focus:outline-none', mainClassName)}>
        {children}
      </main>

      {footer}
    </div>
  )
}

export default AppFrame
