import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Package } from 'lucide-react'
import Container from '@/components/layout/Container'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Reveal from '@/components/ui/motion/Reveal'
import { Tilt } from '@/components/ui/motion/Tilt'
import { getCategoryOverview, getChildCategories } from '@/lib/categories'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Categories',
  description:
    'Browse VEMCO by room: sofas and seating, beds and bedroom, dining, tables, and storage. Solid wood, full specifications, delivered across Pakistan.',
}

/**
 * A server component, not a client fetch.
 *
 * The old version shipped a spinner, fetched five rows over HTTP, and only
 * then had anything to paint -- for data that never changes between visitors
 * and that the server can read while it is rendering.
 */
export default function CategoriesPage() {
  return (
    <Container className="py-section-md">
      <PageHeader
        eyebrow="Browse"
        title="Shop by room"
        lead="Every piece is filed by where it lives, so you can start from the room rather than the catalogue."
      />

      {/* The heading needs nothing from Postgres, so it paints immediately
          while the tiles stream in behind their own boundary. */}
      <Suspense fallback={<CategoryGridSkeleton />}>
        <CategoryGrid />
      </Suspense>
    </Container>
  )
}

async function CategoryGrid() {
  // Independent of each other, so both go out at once rather than the second
  // waiting on the first.
  const [categories, children] = await Promise.all([
    getCategoryOverview(),
    getChildCategories(),
  ])

  if (categories.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No categories yet"
        description="The catalogue has not been set up. Everything we stock is still on the shop page."
        action={
          <Button asChild size="lg">
            <Link href="/products">Browse everything</Link>
          </Button>
        }
      />
    )
  }

  return (
    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category, index) => {
        const subcategories = children[category.id] ?? []

        return (
          <Reveal as="li" key={category.id} index={index}>
            <Card
              interactive
              noPadding
              className="stage lift-on-hover group relative flex h-full flex-col"
            >
              {/* Same 4:5 media frame, tilt and hover scale as ProductCard,
                  so a category tile and a product tile read as one family. */}
              <div className="relative aspect-[4/5] overflow-hidden bg-surface-subtle">
                {category.cover_image ? (
                  <Tilt max={5} className="h-full w-full">
                    <Image
                      src={category.cover_image}
                      alt={category.cover_alt || ''}
                      fill
                      sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                      priority={index < 3}
                      className="scale-105 object-cover transition-transform duration-slow ease-standard group-hover:scale-110"
                    />
                  </Tilt>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Package className="h-10 w-10 text-text-tertiary" aria-hidden="true" />
                  </div>
                )}

                {/* Scrim, so the name stays legible over any photo rather
                    than depending on how dark that particular room was. */}
                <div aria-hidden="true" className="scrim-fade" />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-sheen opacity-0 transition-opacity duration-slow ease-standard group-hover:opacity-100"
                />

                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <h2 className="font-serif text-h2">
                    {/* Stretched link: the whole tile is the target, not
                        just the heading. */}
                    <Link
                      href={`/products?category=${category.id}`}
                      className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                    >
                      {category.name}
                    </Link>
                  </h2>
                  <p className="mt-1 text-ui text-bark-200">
                    {category.product_count}{' '}
                    {category.product_count === 1 ? 'piece' : 'pieces'}
                  </p>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                {category.description && (
                  <p className="text-ui text-text-secondary">{category.description}</p>
                )}

                {subcategories.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {subcategories.map(child => (
                      <Link
                        key={child.id}
                        href={`/products?category=${child.id}`}
                        className="relative z-10 rounded-full border border-border-subtle px-3 py-1 text-caption text-text-secondary transition-colors duration-fast hover:border-border-strong hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Not a second link to the same place -- the tile already
                    goes there. This is the affordance that says so. */}
                <span
                  aria-hidden="true"
                  className="mt-4 inline-flex items-center gap-1.5 text-ui font-medium text-caramel-700"
                >
                  Browse
                  <ArrowRight className="h-4 w-4 transition-transform duration-fast group-hover:translate-x-1" />
                </span>
              </div>
            </Card>
          </Reveal>
        )
      })}
    </ul>
  )
}

/** Six tiles' worth of nothing, so the layout does not jump when they land. */
function CategoryGridSkeleton() {
  return (
    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <li key={index} className="overflow-hidden rounded-md border border-border-subtle">
          <div className="aspect-[4/5] animate-pulse bg-surface-subtle" />
          <div className="space-y-2 p-5">
            <div className="h-4 w-2/3 animate-pulse rounded-xs bg-surface-subtle" />
            <div className="h-4 w-1/3 animate-pulse rounded-xs bg-surface-subtle" />
          </div>
        </li>
      ))}
    </ul>
  )
}
