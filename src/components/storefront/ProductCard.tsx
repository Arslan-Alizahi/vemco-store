'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/cn'
import Card from '@/components/ui/Card'
import Badge, { StockBadge } from '@/components/ui/Badge'
import Money from '@/components/ui/Money'
import IconButton from '@/components/ui/IconButton'
import type { Product } from '@/types/product'

export interface ProductCardProps {
  product: Product
  onAddToCart?: (product: Product) => void
  /** Rendered top-right of the media frame, e.g. a favourite toggle. */
  overlay?: React.ReactNode
  priority?: boolean
  className?: string
}

/**
 * The single product card, shared by home, listing, categories and favourites.
 *
 * Those four previously each had their own: two different image heights
 * (h-48 and h-64), one with an add-to-cart button and one without, and a
 * nested button-inside-anchor.
 *
 * The whole card is the link, via a stretched overlay. Before, only the image
 * was clickable — the product name, the description and the price were all
 * dead, which is the first thing a shopper tries.
 */
export function ProductCard({
  product,
  onAddToCart,
  overlay,
  priority,
  className,
}: ProductCardProps) {
  const image = product.primary_image || product.images?.[0]?.image_url
  const onSale =
    typeof product.compare_at_price === 'number' && product.compare_at_price > product.price
  const outOfStock = product.stock_quantity <= 0

  return (
    <Card interactive noPadding className={cn('group relative flex h-full flex-col', className)}>
      {/* 4:5 portrait — furniture reads taller than square. The transform is on
          the image inside its own clipped frame, never on the card, so type
          stays sharp and nothing spills into the grid gutter. */}
      <div className="relative aspect-[4/5] overflow-hidden bg-surface-subtle">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, (min-width: 640px) 45vw, 90vw"
            priority={priority}
            className="object-cover transition-transform duration-slow ease-standard group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-caption text-text-tertiary">
            No image
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <div className="pointer-events-auto flex flex-col items-start gap-2">
            {onSale && (
              <Badge variant="sale" size="sm">
                Sale
              </Badge>
            )}
            <StockBadge quantity={product.stock_quantity} threshold={product.low_stock_threshold} />
          </div>
          {overlay && <div className="pointer-events-auto">{overlay}</div>}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="mb-1 text-h3 text-text-primary">
          {/* Stretched link: the anchor covers the card, so the name, blurb and
              price are all clickable, while the add-to-cart button above it
              stays independently reachable. */}
          <Link
            href={`/products/${product.slug}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            {product.name}
          </Link>
        </h3>

        {product.description && (
          <p className="mb-4 line-clamp-2 text-ui text-text-secondary">{product.description}</p>
        )}

        <div className="mt-auto flex items-end justify-between gap-3">
          <div>
            {/* Price is neutral. Colouring it spends the accent on information
                and leaves nothing louder to signal a markdown. */}
            <Money amount={product.price} className="block text-h3 text-text-primary" />
            {onSale && (
              <Money amount={product.compare_at_price!} strike className="text-caption" />
            )}
          </div>

          {onAddToCart && (
            <IconButton
              label={outOfStock ? `${product.name} is out of stock` : `Add ${product.name} to cart`}
              variant="solid"
              disabled={outOfStock}
              onClick={() => onAddToCart(product)}
              className="relative z-10"
            >
              <ShoppingCart />
            </IconButton>
          )}
        </div>
      </div>
    </Card>
  )
}

export default ProductCard
