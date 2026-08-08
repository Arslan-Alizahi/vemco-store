'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { Check, ChevronRight, Heart, Minus, PackageX, Plus, Share2, ShoppingCart, Truck } from 'lucide-react'
import Container from '@/components/layout/Container'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Money from '@/components/ui/Money'
import IconButton from '@/components/ui/IconButton'
import Spinner from '@/components/ui/Spinner'
import ErrorState from '@/components/ui/ErrorState'
import EmptyState from '@/components/ui/EmptyState'
import ProductCard from '@/components/storefront/ProductCard'
import { Tilt } from '@/components/ui/motion/Tilt'
import { useCart } from '@/hooks/useCart'
import { useFavorites } from '@/hooks/useFavorites'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { formatAmount } from '@/lib/utils'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { addToCart } = useCart()
  const { toggleFavorite, isFavorite } = useFavorites()
  const { addToast } = useToast()

  const [product, setProduct] = useState<any>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'missing'>('loading')
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (!params.slug) return

    fetch(`/api/products/slug/${params.slug}`)
      .then(async response => {
        /**
         * Say so, rather than redirecting to the full catalogue.
         *
         * A dead link -- an old bookmark, a shared URL, a piece that has been
         * withdrawn -- used to land the visitor on "All furniture" with no
         * explanation, which reads as the site losing their click. It is also
         * a soft 404: search engines see a redirect to a healthy page and
         * keep the dead URL indexed.
         */
        if (response.status === 404) {
          setStatus('missing')
          return null
        }
        if (!response.ok) throw new Error('Request failed')
        return response.json()
      })
      .then(data => {
        if (!data) return
        setProduct(data)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [params.slug, router])

  if (status === 'loading') {
    return (
      <Container className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </Container>
    )
  }

  // Gone is not the same as broken, and offering Retry on a piece that does
  // not exist just invites the visitor to fail twice.
  if (status === 'missing') {
    return (
      <Container size="prose" className="py-section-md">
        <EmptyState
          icon={PackageX}
          title="We could not find that piece"
          description="It may have sold out and been withdrawn, or the link may have a typo in it. Everything we stock is on the shop page."
          action={
            <Button asChild size="lg">
              <Link href="/products">Browse everything</Link>
            </Button>
          }
        />
      </Container>
    )
  }

  if (status === 'error' || !product) {
    return (
      <Container size="prose" className="py-section-md">
        <ErrorState
          title="We could not load this piece"
          onRetry={() => window.location.reload()}
        />
      </Container>
    )
  }

  const inStock = product.stock_quantity > 0
  const lowStock = inStock && product.stock_quantity <= (product.low_stock_threshold ?? 5)
  const onSale = product.compare_at_price && product.compare_at_price > product.price
  const favourite = isFavorite(product.id)

  const cartPayload = {
    product_id: product.id,
    product_name: product.name,
    product_slug: product.slug,
    product_image: product.images?.[0]?.image_url,
    product_sku: product.sku,
    quantity,
    unit_price: product.price,
    stock_quantity: product.stock_quantity,
  }

  const handleAddToCart = () => {
    addToCart(cartPayload)
    addToast(`${product.name} added to cart`, 'success')
  }

  const handleToggleFavourite = () => {
    const nowFavourite = toggleFavorite({
      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug,
      product_image: product.images?.[0]?.image_url,
      product_sku: product.sku,
      price: product.price,
      compare_at_price: product.compare_at_price,
      stock_quantity: product.stock_quantity,
    })
    addToast(nowFavourite ? 'Saved to favourites' : 'Removed from favourites', 'info')
  }

  const handleShare = async () => {
    const shareData = { title: product.name, text: product.description, url: window.location.href }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') console.error(error)
      }
      return
    }
    try {
      await navigator.clipboard.writeText(window.location.href)
      addToast('Link copied', 'success')
    } catch {
      addToast('Could not copy the link', 'error')
    }
  }

  return (
    <>
      <Container className="py-8 pb-28 lg:pb-section-md">
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ui text-text-secondary">
            <li>
              <Link href="/" className="hover:text-text-primary">
                Home
              </Link>
            </li>
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            <li>
              <Link href="/products" className="hover:text-text-primary">
                Shop
              </Link>
            </li>
            {product.category_name && (
              <>
                <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                <li>
                  <Link
                    href={`/products?category=${product.category_id}`}
                    className="hover:text-text-primary"
                  >
                    {product.category_name}
                  </Link>
                </li>
              </>
            )}
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            <li aria-current="page" className="font-medium text-text-primary">
              {product.name}
            </li>
          </ol>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <div className="stage relative aspect-[4/5] overflow-hidden rounded-lg bg-surface-subtle shadow-e2">
              <Tilt max={4} className="h-full w-full">
                <Image
                  src={product.images?.[selectedImage]?.image_url || '/placeholder.png'}
                  alt={product.images?.[selectedImage]?.alt_text || product.name}
                  fill
                  sizes="(min-width: 1024px) 45vw, 92vw"
                  priority
                  className="scale-105 object-cover"
                />
              </Tilt>
            </div>

            {product.images?.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {product.images.map((image: any, index: number) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setSelectedImage(index)}
                    aria-label={`View image ${index + 1} of ${product.images.length}`}
                    aria-current={selectedImage === index}
                    className={cn(
                      'relative aspect-square overflow-hidden rounded-sm border-2 transition-colors duration-fast',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
                      selectedImage === index
                        ? 'border-caramel-600'
                        : 'border-transparent hover:border-border-strong'
                    )}
                  >
                    <Image
                      src={image.image_url}
                      alt=""
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sticky on desktop, so the price and Add to Cart stay in view
              through a long specification. */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <h1 className="font-serif text-h1 text-text-primary">{product.name}</h1>
            {product.description && (
              <p className="mt-3 text-body-lg text-text-secondary">{product.description}</p>
            )}

            <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <Money amount={product.price} className="text-h1 text-text-primary" />
              {onSale && (
                <>
                  <Money amount={product.compare_at_price} strike className="text-body-lg" />
                  {/* One text node, not "Save" beside a <Money> element: Badge
                      is inline-flex, and a flex container drops the whitespace
                      between adjacent items, so it rendered as "Save53,000". */}
                  <Badge variant="sale" size="sm" className="tabular-nums">
                    {`Save ${formatAmount(product.compare_at_price - product.price)}`}
                  </Badge>
                </>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3">
              {inStock ? (
                <>
                  <span className="flex items-center gap-1.5 text-ui font-medium text-success-700">
                    <Check className="h-4 w-4" aria-hidden="true" />
                    In stock
                  </span>
                  {lowStock && <Badge variant="warning">Only {product.stock_quantity} left</Badge>}
                </>
              ) : (
                <Badge variant="danger">Out of stock</Badge>
              )}
              <span className="font-mono text-caption text-text-tertiary">{product.sku}</span>
            </div>

            {inStock ? (
              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-ui font-medium text-text-secondary">Quantity</span>
                  <div className="flex items-center rounded-sm border border-border-subtle bg-surface shadow-well">
                    <IconButton
                      label="Decrease quantity"
                      size="sm"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    >
                      <Minus />
                    </IconButton>
                    <span className="w-10 text-center text-ui font-medium tabular-nums">
                      {quantity}
                    </span>
                    <IconButton
                      label="Increase quantity"
                      size="sm"
                      disabled={quantity >= product.stock_quantity}
                      onClick={() => setQuantity(q => Math.min(product.stock_quantity, q + 1))}
                    >
                      <Plus />
                    </IconButton>
                  </div>
                </div>

                <Button
                  size="lg"
                  fullWidth
                  onClick={handleAddToCart}
                  leftIcon={<ShoppingCart className="h-4 w-4" />}
                >
                  Add to cart
                </Button>
              </div>
            ) : (
              <div className="mt-8 rounded-md border border-border-subtle bg-surface-subtle p-5">
                <p className="text-body text-text-secondary">
                  This one is out of stock. Tell us and we will let you know the moment it is
                  back, usually within three weeks.
                </p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href={`/contact?product=${product.sku}`}>Notify me</Link>
                </Button>
              </div>
            )}

            {/* Outside the stock guard, deliberately. These used to be nested
                inside it, so an out-of-stock page had no way to save the piece,
                share it, or do anything at all -- a complete dead end. */}
            <div className="mt-4 flex gap-3">
              <Button
                variant="outline"
                onClick={handleToggleFavourite}
                leftIcon={
                  <Heart className={cn('h-4 w-4', favourite && 'fill-current text-danger-600')} />
                }
              >
                {favourite ? 'Saved' : 'Save'}
              </Button>
              <Button
                variant="outline"
                onClick={handleShare}
                leftIcon={<Share2 className="h-4 w-4" />}
              >
                Share
              </Button>
            </div>

            <p className="mt-6 flex items-start gap-2 text-ui text-text-secondary">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-caramel-700" aria-hidden="true" />
              Delivered in 3-5 working days.{' '}
              <Link href="/shipping" className="underline underline-offset-4">
                Rates and access notes
              </Link>
            </p>

            {product.long_description && (
              <Card className="mt-8 bg-surface-subtle">
                <h2 className="mb-3 text-h3 text-text-primary">The detail</h2>
                <p className="whitespace-pre-line text-body text-text-secondary">
                  {product.long_description}
                </p>
              </Card>
            )}
          </div>
        </div>

        {product.relatedProducts?.length > 0 && (
          <section aria-labelledby="related" className="mt-section-md">
            <h2 id="related" className="mb-8 font-serif text-h2 text-text-primary">
              Goes with this
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {product.relatedProducts.map((related: any) => (
                <ProductCard key={related.id} product={related} />
              ))}
            </div>
          </section>
        )}
      </Container>

      {/* Mobile buy bar. On a long specification page the Add to Cart button
          scrolls far out of reach on a phone; this keeps the price and the
          action available without hunting for them. */}
      {inStock && (
        <div className="fixed inset-x-0 bottom-0 z-sticky border-t border-border-subtle bg-surface/95 p-3 shadow-e4 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-caption text-text-secondary">{product.name}</p>
              <Money amount={product.price * quantity} className="text-body font-medium" />
            </div>
            <Button size="lg" onClick={handleAddToCart} className="shrink-0">
              Add to cart
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
