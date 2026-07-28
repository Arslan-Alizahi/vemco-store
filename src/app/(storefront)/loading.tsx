import Container from '@/components/layout/Container'
import { Skeleton } from '@/components/ui/Skeleton'

/**
 * Storefront route-change placeholder.
 *
 * Deliberately generic: a title block and a few lines. Anything more specific
 * would be wrong on most of the routes it covers, and a layout that shifts
 * when content arrives is worse than one that does not.
 */
export default function Loading() {
  return (
    <Container className="py-section-md">
      <div className="max-w-prose">
        <Skeleton className="mb-4 h-9 w-2/3" />
        <Skeleton className="mb-2 h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
      </div>
    </Container>
  )
}
