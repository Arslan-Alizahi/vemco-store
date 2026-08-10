import type { Metadata } from 'next'
import { runGet, runQuery } from '@/lib/db'
import { absoluteUrl, SITE_NAME } from '@/lib/site'
import { BRAND_ADDRESS, BRAND_NAME, BRAND_PHONES } from '@/lib/brand'
import ProductDetail from './ProductDetail'

export const dynamic = 'force-dynamic'

interface ProductRow {
  id: number
  name: string
  slug: string
  description: string | null
  long_description: string | null
  price: number
  compare_at_price: number | null
  sku: string | null
  stock_quantity: number
  category_name: string | null
}

/**
 * Everything the share card and the structured data need, in one query.
 *
 * Read on the server so it is in the HTML the scraper receives. WhatsApp and
 * Facebook do not run JavaScript: a page that fetches its own product after
 * hydration has, as far as they are concerned, no product on it -- which is
 * why this page had to be split in two. The interactive half is still a
 * client component; this half exists to be read by machines.
 */
const loadProduct = async (slug: string) => {
  try {
    const product = (await runGet<ProductRow>(
      `SELECT p.id, p.name, p.slug, p.description, p.long_description, p.price,
              p.compare_at_price, p.sku, p.stock_quantity,
              c.name AS category_name
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.slug = ? AND p.is_active = 1`,
      [slug]
    )) as ProductRow | undefined

    if (!product) return null

    const images = await runQuery<{ image_url: string }>(
      `SELECT image_url FROM product_images
        WHERE product_id = ?
        ORDER BY is_primary DESC, display_order ASC`,
      [product.id]
    )

    return { product, images: images.map(image => image.image_url) }
  } catch (error) {
    console.error('Could not read the product for its metadata:', error)
    return null
  }
}

/** The sentence under a shared link. The piece, what it is, what it costs. */
const shareDescription = (product: ProductRow) => {
  /**
   * The listing's own words first, trimmed to something that fits under a
   * link. Past roughly 300 characters every platform that shows a preview
   * cuts it mid-word, which reads worse than a short description does.
   */
  const own = (product.description || product.long_description || '').trim()
  const lead = own || `${product.name} from ${BRAND_NAME}.`
  const tail = 'Full dimensions listed. Delivered across Pakistan.'

  if (lead.length + tail.length + 1 <= 300) return `${lead} ${tail}`
  return lead.length <= 300 ? lead : `${lead.slice(0, 297).trimEnd()}…`
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const found = await loadProduct(params.slug)

  if (!found) {
    return {
      title: 'Piece not found',
      robots: { index: false, follow: true },
    }
  }

  const { product } = found
  const description = shareDescription(product)
  const url = absoluteUrl(`/products/${product.slug}`)

  return {
    title: product.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      title: `${product.name} — ${SITE_NAME}`,
      description,
      url,
      siteName: SITE_NAME,
      /**
       * `images` is deliberately not set.
       *
       * Setting it here would override the file convention, and the card
       * drawn by opengraph-image.tsx in this folder is the better preview:
       * the photograph plus the name and the price, already at the 1200x630
       * that every platform crops to. Handing over the raw photograph instead
       * would arrive with its top and bottom cut off, because the shop's
       * product shots are portrait.
       */
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} — ${SITE_NAME}`,
      description,
    },
  }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const found = await loadProduct(params.slug)

  /**
   * Structured data, so a search result can carry the price and whether it is
   * in stock rather than just a blue link.
   *
   * Rendered here rather than in the client half for the same reason as the
   * metadata: Google reads the HTML it is served. Only emitted when the piece
   * actually exists -- marking up a product that is not there is the kind of
   * thing that gets structured data ignored site-wide.
   */
  const jsonLd = found && {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: found.product.name,
    description: shareDescription(found.product),
    sku: found.product.sku || undefined,
    image: found.images.map(image =>
      image.startsWith('http') ? image : absoluteUrl(image)
    ),
    category: found.product.category_name || undefined,
    brand: { '@type': 'Brand', name: BRAND_NAME },
    offers: {
      '@type': 'Offer',
      url: absoluteUrl(`/products/${found.product.slug}`),
      priceCurrency: 'PKR',
      price: String(found.product.price),
      availability:
        found.product.stock_quantity > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'FurnitureStore',
        name: BRAND_NAME,
        telephone: BRAND_PHONES[0],
        address: BRAND_ADDRESS,
      },
    },
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // The content is built above from database columns, not from
          // anything a visitor can set, and JSON.stringify escapes what it
          // contains. The one real risk is a product name containing `</`,
          // which would close the script tag early.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          }}
        />
      )}
      <ProductDetail />
    </>
  )
}
