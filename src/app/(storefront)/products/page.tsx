'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import Container from '@/components/layout/Container'
import PageHeader from '@/components/layout/PageHeader'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Pagination from '@/components/ui/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import { ProductCardSkeleton } from '@/components/ui/Skeleton'
import ProductCard from '@/components/storefront/ProductCard'
import { useToast } from '@/components/ui/Toast'
import { useCart } from '@/hooks/useCart'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/cn'
import type { Product } from '@/types/product'
import type { Category } from '@/types/category'

const SORTS = [
  { value: 'created_at:desc', label: 'Newest first' },
  { value: 'price:asc', label: 'Price: low to high' },
  { value: 'price:desc', label: 'Price: high to low' },
  { value: 'name:asc', label: 'Name: A to Z' },
]

const PER_PAGE = 12

function ProductsContent() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  // All state lives in the URL, so a filtered view is shareable and the back
  // button does what the user expects.
  const search = params.get('q') ?? ''
  const categoryId = params.get('category') ?? ''
  const sort = params.get('sort') ?? 'created_at:desc'
  const page = Math.max(1, Number(params.get('page') ?? '1'))

  const [draftSearch, setDraftSearch] = useState(search)
  const debouncedSearch = useDebounce(draftSearch, 400)

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [status, setStatus] = useState<'cold' | 'refining' | 'ready' | 'error'>('cold')

  const setParams = useCallback(
    (next: Record<string, string | null>, options?: { resetPage?: boolean }) => {
      const resetPage = options?.resetPage ?? true
      const query = new URLSearchParams(params.toString())
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === '') query.delete(key)
        else query.set(key, value)
      }
      // Changing sort or a filter must return to page 1. Previously it kept the
      // page number, so sorting from page 5 refetched page 5 of a newly ordered
      // set and could strand the user on an empty grid.
      if (resetPage) query.delete('page')
      const qs = query.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [params, pathname, router]
  )

  useEffect(() => {
    if (debouncedSearch !== search) setParams({ q: debouncedSearch || null })
  }, [debouncedSearch, search, setParams])

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setCategories(data.success ? (data.data ?? []) : []))
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    let cancelled = false
    // Cold load shows skeletons; refining crossfades the existing grid rather
    // than tearing it down, so the page does not flash empty on a keystroke.
    setStatus(current => (current === 'ready' ? 'refining' : 'cold'))

    const [sortBy, sortOrder] = sort.split(':')
    const query = new URLSearchParams({
      page: String(page),
      limit: String(PER_PAGE),
      sort_by: sortBy,
      sort_order: sortOrder,
    })
    if (search) query.set('search', search)
    if (categoryId) query.set('category_id', categoryId)

    fetch(`/api/products?${query}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return
        if (!data.success) throw new Error('Request failed')
        setProducts(data.data.products ?? [])
        setTotal(data.data.pagination?.total ?? 0)
        setTotalPages(data.data.pagination?.totalPages ?? 1)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [page, sort, search, categoryId])

  const { addToCart } = useCart()
  const { addToast } = useToast()

  const handleAddToCart = (product: Product) => {
    addToCart({
      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug,
      product_image: product.primary_image ?? product.images?.[0]?.image_url,
      product_sku: product.sku,
      quantity: 1,
      unit_price: product.price,
      stock_quantity: product.stock_quantity,
    })
    addToast(`${product.name} added to cart`, 'success')
  }

  const activeCategory = categories.find(category => String(category.id) === categoryId)
  const hasFilters = Boolean(search || categoryId)
  const clearAll = () => {
    setDraftSearch('')
    router.push(pathname, { scroll: false })
  }

  return (
    <Container className="py-section-md">
      <PageHeader
        eyebrow="Shop"
        title="All furniture"
        lead="Every piece with full dimensions, materials and a doorway clearance note."
      />

      <div className="mb-6 rounded-md bg-surface p-4 shadow-e0">
        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <Input
            label="Search"
            placeholder="Sofa, dining table, wardrobe…"
            leftIcon={<Search className="h-4 w-4" />}
            value={draftSearch}
            onChange={event => setDraftSearch(event.target.value)}
          />
          <Select
            label="Category"
            value={categoryId}
            onChange={event => setParams({ category: event.target.value || null })}
            options={[
              { value: '', label: 'All categories' },
              ...categories.map(category => ({
                value: String(category.id),
                label: category.name,
              })),
            ]}
          />
          <Select
            label="Sort by"
            value={sort}
            onChange={event => setParams({ sort: event.target.value })}
            options={SORTS}
          />
        </div>

        {hasFilters && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-4">
            <SlidersHorizontal className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setDraftSearch('')
                  setParams({ q: null })
                }}
                aria-label={`Remove search filter ${search}`}
                className="rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Badge variant="secondary">
                  &ldquo;{search}&rdquo;
                  <X className="ml-1 inline h-3 w-3" aria-hidden="true" />
                </Badge>
              </button>
            )}
            {activeCategory && (
              <button
                type="button"
                onClick={() => setParams({ category: null })}
                aria-label={`Remove category filter ${activeCategory.name}`}
                className="rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Badge variant="secondary">
                  {activeCategory.name}
                  <X className="ml-1 inline h-3 w-3" aria-hidden="true" />
                </Badge>
              </button>
            )}
            <Button variant="link" size="sm" onClick={clearAll} className="ml-auto">
              Clear all
            </Button>
          </div>
        )}
      </div>

      <p className="mb-6 text-ui text-text-secondary" aria-live="polite">
        {status === 'cold'
          ? 'Loading…'
          : `${total} ${total === 1 ? 'piece' : 'pieces'}${activeCategory ? ` in ${activeCategory.name}` : ''}`}
      </p>

      {status === 'error' ? (
        <ErrorState
          title="We could not load the catalogue"
          onRetry={() => setParams({}, { resetPage: false })}
        />
      ) : status === 'cold' ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: PER_PAGE }, (_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title="Nothing matches that"
          description={
            search
              ? `We could not find anything for “${search}”. Try a broader word, or clear the filters.`
              : 'There is nothing in this category yet.'
          }
          action={hasFilters ? <Button onClick={clearAll}>Clear all filters</Button> : undefined}
        />
      ) : (
        <div
          className={cn(
            'grid grid-cols-1 gap-6 transition-opacity duration-fast ease-standard sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
            status === 'refining' && 'opacity-60'
          )}
        >
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
              priority={index < 4}
            />
          ))}
        </div>
      )}

      {status !== 'cold' && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onChange={next => setParams({ page: String(next) }, { resetPage: false })}
          className="mt-12"
        />
      )}
    </Container>
  )
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <Container className="py-section-md">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: PER_PAGE }, (_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        </Container>
      }
    >
      <ProductsContent />
    </Suspense>
  )
}
