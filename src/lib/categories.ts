import { runQuery } from '@/lib/db'
import { isShowcase, staticCategories, staticProducts } from '@/lib/catalogue'
import type { Category } from '@/types/category'

export interface CategoryOverview extends Category {
  product_count: number
  /** Photo of a product in this category, used as the card's cover. */
  cover_image: string | null
  cover_alt: string | null
}

/**
 * Categories with a real product count and a cover photo, read on the server.
 *
 * Two things this fixes over the previous client fetch. The count now excludes
 * inactive and out-of-stock-forever rows, so the number on the card matches
 * what the listing actually shows when you click through. And because no
 * category carries its own `image_url`, the cover is borrowed from a product
 * inside it -- otherwise every card renders as a bare box with an icon, which
 * is a poor advert for a furniture shop.
 */
export const getCategoryOverview = (): CategoryOverview[] => {
  if (isShowcase()) {
    const products = staticProducts()
    return staticCategories().map(category => {
      const first = products.find(product => product.category_id === category.id)
      return {
        ...category,
        product_count: products.filter(p => p.category_id === category.id).length,
        cover_image: first?.primary_image ?? null,
        cover_alt: first?.name ?? null,
      } as CategoryOverview
    })
  }

  try {
    return runQuery<CategoryOverview>(`
      SELECT
        c.*,
        (
          SELECT COUNT(*) FROM products p
          WHERE p.category_id = c.id AND p.is_active = 1
        ) AS product_count,
        COALESCE(c.image_url, (
          SELECT pi.image_url
          FROM products p
          JOIN product_images pi ON pi.product_id = p.id
          WHERE p.category_id = c.id AND p.is_active = 1
          ORDER BY p.is_featured DESC, pi.is_primary DESC, pi.display_order ASC
          LIMIT 1
        )) AS cover_image,
        (
          SELECT pi.alt_text
          FROM products p
          JOIN product_images pi ON pi.product_id = p.id
          WHERE p.category_id = c.id AND p.is_active = 1
          ORDER BY p.is_featured DESC, pi.is_primary DESC, pi.display_order ASC
          LIMIT 1
        ) AS cover_alt
      FROM categories c
      WHERE c.is_active = 1 AND c.parent_id IS NULL
      ORDER BY c.display_order ASC, c.name ASC
    `)
  } catch (error) {
    console.error('Failed to load categories:', error)
    return []
  }
}

/**
 * Child categories, keyed by parent id.
 *
 * Kept separate from the query above so the overview stays one flat row per
 * card. The seeded catalogue is flat, but the schema allows nesting and the
 * admin can create it, so the page still has to handle it.
 */
export const getChildCategories = (): Record<number, Category[]> => {
  // The seeded catalogue is flat, so there are none.
  if (isShowcase()) return {}

  try {
    const rows = runQuery<Category>(`
      SELECT * FROM categories
      WHERE is_active = 1 AND parent_id IS NOT NULL
      ORDER BY display_order ASC, name ASC
    `)

    return rows.reduce<Record<number, Category[]>>((grouped, child) => {
      const parent = child.parent_id
      if (!parent) return grouped
      grouped[parent] = [...(grouped[parent] ?? []), child]
      return grouped
    }, {})
  } catch (error) {
    console.error('Failed to load subcategories:', error)
    return {}
  }
}
