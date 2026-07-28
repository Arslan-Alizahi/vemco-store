'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart, Trash2 } from 'lucide-react'
import Container from '@/components/layout/Container'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ProductCard from '@/components/storefront/ProductCard'
import { useToast } from '@/components/ui/Toast'
import { useCart } from '@/hooks/useCart'
import { useFavorites } from '@/hooks/useFavorites'
import type { Product } from '@/types/product'
import type { FavoriteItem } from '@/types/favorites'

/**
 * Favourites are stored as their own flat shape in localStorage, not as full
 * products. This adapts one to the shape ProductCard expects so the page uses
 * the same card as the rest of the storefront instead of a fourth variant.
 */
const toProduct = (item: FavoriteItem): Product =>
  ({
    id: item.product_id,
    name: item.product_name,
    slug: item.product_slug,
    sku: item.product_sku ?? '',
    price: item.price,
    compare_at_price: item.compare_at_price,
    stock_quantity: item.stock_quantity,
    primary_image: item.product_image,
    category_id: 0,
  }) as Product

export default function FavoritesPage() {
  const { favorites, addToFavorites, removeFromFavorites, clearFavorites, isLoading } =
    useFavorites()
  const { addToCart } = useCart()
  const { addToast } = useToast()
  const [confirmClear, setConfirmClear] = useState(false)

  const handleRemove = (item: FavoriteItem) => {
    removeFromFavorites(item.product_id)
    // Reversible in one tap, so an Undo beats a confirmation dialog here.
    addToast(`${item.product_name} removed`, 'info', 6000, {
      label: 'Undo',
      onClick: () => addToFavorites(item),
    })
  }

  const handleAddToCart = (product: Product) => {
    if (product.stock_quantity <= 0) {
      addToast('That one is out of stock', 'error')
      return
    }
    addToCart({
      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug,
      product_image: product.primary_image,
      product_sku: product.sku,
      quantity: 1,
      unit_price: product.price,
      stock_quantity: product.stock_quantity,
    })
    addToast(`${product.name} added to cart`, 'success')
  }

  if (isLoading) return null

  return (
    <Container className="py-section-md">
      <ConfirmDialog
        isOpen={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          clearFavorites()
          addToast('All favourites cleared', 'info')
        }}
        title="Clear all favourites?"
        description={`All ${favorites.length} saved ${favorites.length === 1 ? 'item' : 'items'} will be removed from your list. Your cart is not affected.`}
        confirmLabel="Clear all"
        destructive
      />

      <PageHeader
        eyebrow="Saved"
        title="Your favourites"
        lead={
          favorites.length > 0
            ? `${favorites.length} ${favorites.length === 1 ? 'piece' : 'pieces'} saved for later.`
            : undefined
        }
        actions={
          favorites.length > 0 ? (
            <Button variant="outline" onClick={() => setConfirmClear(true)}>
              Clear all
            </Button>
          ) : undefined
        }
      />

      {favorites.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Nothing saved yet"
          description="Tap the heart on any piece to keep it here while you decide. Saved items stay on this device."
          action={
            <Button asChild size="lg">
              <Link href="/products">Browse furniture</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {favorites.map(item => (
            <ProductCard
              key={item.product_id}
              product={toProduct(item)}
              onAddToCart={handleAddToCart}
              overlay={
                <IconButton
                  label={`Remove ${item.product_name} from favourites`}
                  variant="solid"
                  size="sm"
                  onClick={() => handleRemove(item)}
                  className="bg-surface/90 text-text-secondary shadow-e1 hover:bg-surface hover:text-danger-600"
                >
                  <Trash2 />
                </IconButton>
              }
            />
          ))}
        </div>
      )}
    </Container>
  )
}
