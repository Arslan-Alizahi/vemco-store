import { cn } from '@/lib/cn'

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  /** Chosen from the scale, never invented. */
  spacing?: 'sm' | 'md' | 'lg' | 'none'
  surface?: 'canvas' | 'surface' | 'subtle' | 'none'
}

/**
 * Vertical rhythm between page sections.
 *
 * Replaces py-6, py-8, py-12, py-16 and py-20 picked at random at the same
 * structural level. Three values, chosen from a set.
 */
export function Section({
  spacing = 'md',
  surface = 'none',
  className,
  ...props
}: SectionProps) {
  return (
    <section
      className={cn(
        spacing === 'sm' && 'py-section-sm',
        spacing === 'md' && 'py-section-md',
        spacing === 'lg' && 'py-section-lg',
        surface === 'canvas' && 'bg-canvas',
        surface === 'surface' && 'bg-surface',
        surface === 'subtle' && 'bg-surface-subtle',
        className
      )}
      {...props}
    />
  )
}

export default Section
