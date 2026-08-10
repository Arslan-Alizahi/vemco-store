import type { MetadataRoute } from 'next'
import { runQuery } from '@/lib/db'
import { absoluteUrl } from '@/lib/site'

/**
 * Built from the catalogue, not from a list somebody maintains by hand.
 *
 * A hand-written sitemap is wrong the day after it is written: the shop adds
 * a sofa, nobody edits this file, and the new page is the one thing that most
 * needed finding. Reading the products table means the sitemap is right by
 * construction, including the day every piece is replaced.
 */
export const dynamic = 'force-dynamic'

/** The pages that exist whatever is in the database. */
const STATIC: [path: string, priority: number, frequency: MetadataRoute.Sitemap[number]['changeFrequency']][] = [
  ['/', 1, 'weekly'],
  ['/products', 0.9, 'daily'],
  ['/categories', 0.8, 'weekly'],
  ['/about', 0.6, 'monthly'],
  ['/contact', 0.7, 'monthly'],
  ['/faq', 0.5, 'monthly'],
  ['/shipping', 0.5, 'monthly'],
  ['/press', 0.3, 'yearly'],
  ['/careers', 0.3, 'yearly'],
  ['/blog', 0.3, 'monthly'],
  ['/policies/privacy', 0.2, 'yearly'],
  ['/policies/terms', 0.2, 'yearly'],
  ['/policies/returns', 0.4, 'yearly'],
  ['/policies/cookies', 0.2, 'yearly'],
  ['/accessibility', 0.2, 'yearly'],
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const pages: MetadataRoute.Sitemap = STATIC.map(([path, priority, changeFrequency]) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency,
    priority,
  }))

  /**
   * A failure here must not take the sitemap down with it.
   *
   * A sitemap listing fifteen pages is worth having; a 500 tells the crawler
   * the whole file is broken and it stops asking. Only active products, and
   * each one's own updated_at so a crawler can tell what has actually
   * changed since it last looked.
   */
  try {
    const products = await runQuery<{ slug: string; updated_at: string }>(
      `SELECT slug, updated_at FROM products WHERE is_active = 1 ORDER BY updated_at DESC`
    )

    for (const product of products) {
      pages.push({
        url: absoluteUrl(`/products/${product.slug}`),
        lastModified: product.updated_at ? new Date(product.updated_at) : now,
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }
  } catch (error) {
    console.error('Sitemap: the catalogue could not be read:', error)
  }

  return pages
}
