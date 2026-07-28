import { cn } from '@/lib/cn'

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'prose' | 'content' | 'wide'
  as?: 'div' | 'section' | 'main' | 'header' | 'footer'
}

/**
 * The one place page width and gutter are decided.
 *
 * Replaces thirteen distinct max-w values and fourteen verbatim copies of the
 * gutter string. `prose` caps long-form at ~68 characters per line; the legal
 * pages were running about 110, which is well past comfortable reading.
 */
export function Container({
  size = 'content',
  as: Tag = 'div',
  className,
  ...props
}: ContainerProps) {
  return (
    <Tag
      className={cn(
        'mx-auto w-full px-5 sm:px-6 lg:px-8',
        size === 'prose' && 'max-w-prose',
        size === 'content' && 'max-w-content',
        size === 'wide' && 'max-w-wide',
        className
      )}
      {...props}
    />
  )
}

export default Container
