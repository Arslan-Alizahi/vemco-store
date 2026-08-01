import {
  LARGE,
  SMALL,
  categories as seedCategories,
  footerNavItems,
  navItems,
  products as seedProducts,
  socialLinks as seedSocial,
} from '@/lib/db/seed'
import type { Product } from '@/types/product'
import type { Category } from '@/types/category'
import type { NavItem } from '@/types/nav'

/**
 * The catalogue, without a database.
 *
 * A storefront-only build has nowhere to run SQLite: Vercel's filesystem is
 * read only, and each serverless instance would get its own empty copy
 * anyway. The catalogue does not change between visitors, so in showcase mode
 * it is read from the same seed data that populates the database everywhere
 * else — one source, so the deployed site and the local one cannot show
 * different products.
 *
 * Anything added through the admin panel lives only in that SQLite file and
 * will not appear here. In a build with no database, `seed.ts` is the
 * catalogue.
 */
export const isShowcase = (): boolean => process.env.NEXT_PUBLIC_SHOWCASE === 'true'

/** Ids are positional and stable, because the seed order is. */
const categoryId = (slug: string) => seedCategories.findIndex(c => c.slug === slug) + 1

export const staticCategories = (): Category[] =>
  seedCategories.map((category, index) => ({
    id: index + 1,
    name: category.name,
    slug: category.slug,
    description: category.description,
    is_active: true,
    display_order: index,
    product_count: seedProducts.filter(p => p.category === category.slug).length,
  }))

export const staticProducts = (): Product[] =>
  seedProducts.map((product, index) => ({
    id: index + 1,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    description: product.description,
    long_description: product.long_description,
    price: product.price,
    compare_at_price: product.compare_at_price ?? undefined,
    cost_price: product.cost_price,
    stock_quantity: product.stock_quantity,
    low_stock_threshold: 5,
    category_id: categoryId(product.category),
    category_name: seedCategories.find(c => c.slug === product.category)?.name,
    is_featured: Boolean(product.is_featured),
    is_active: true,
    primary_image: SMALL(product.slug),
    images: [
      { id: index * 2 + 1, product_id: index + 1, image_url: SMALL(product.slug), alt_text: product.name, is_primary: true, display_order: 0 },
      { id: index * 2 + 2, product_id: index + 1, image_url: LARGE(product.slug), alt_text: product.name, is_primary: false, display_order: 1 },
    ],
  })) as unknown as Product[]

export const staticProductBySlug = (slug: string): Product | null => {
  const all = staticProducts()
  const product = all.find(item => item.slug === slug)
  if (!product) return null

  return {
    ...product,
    // The four other pieces from the same room, as the database query does.
    relatedProducts: all
      .filter(item => item.category_id === product.category_id && item.id !== product.id)
      .slice(0, 4),
  } as Product
}

export const staticNav = (location: 'header' | 'footer'): NavItem[] => {
  const source = location === 'header' ? navItems : footerNavItems
  return source.map((item, index) => ({
    id: -(index + 1),
    label: item.label,
    href: item.href,
    display_order: item.display_order,
    is_active: true,
    location,
  }))
}

export const staticSocialLinks = () =>
  seedSocial.map((link, index) => ({
    id: index + 1,
    platform: link.platform,
    url: link.url,
    icon: link.icon,
    display_order: link.display_order,
    is_active: 1,
  }))
