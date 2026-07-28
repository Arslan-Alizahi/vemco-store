import { cn } from '@/lib/cn'

export interface ProseProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Typographic defaults for long-form copy.
 *
 * Replaces roughly forty hand-classed paragraphs and twelve hand-rolled list
 * styles across the legal and editorial pages. Descendant selectors rather
 * than a plugin, so it stays on the project's own type and colour tokens
 * instead of introducing a second scale.
 */
export function Prose({ className, ...props }: ProseProps) {
  return (
    <div
      className={cn(
        'max-w-prose text-body-lg text-text-secondary',
        '[&>*+*]:mt-4',
        '[&_h2]:mt-12 [&_h2]:font-serif [&_h2]:text-h2 [&_h2]:text-text-primary',
        '[&_h3]:mt-8 [&_h3]:text-h3 [&_h3]:text-text-primary',
        // A heading sits close to the paragraph it introduces, not floating
        // equidistant between two blocks.
        '[&_h2+p]:mt-3 [&_h3+p]:mt-3',
        '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
        '[&_li]:mt-2 [&_li]:pl-1',
        '[&_a]:text-caramel-700 [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-caramel-800',
        '[&_strong]:font-medium [&_strong]:text-text-primary',
        '[&_hr]:my-10 [&_hr]:border-border-subtle',
        className
      )}
      {...props}
    />
  )
}

export default Prose
