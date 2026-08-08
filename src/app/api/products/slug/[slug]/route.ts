import { NextRequest, NextResponse } from 'next/server'
import { runGet, runQuery } from '@/lib/db'
import { isShowcase, staticProductBySlug } from '@/lib/catalogue'

/**
 * Never evaluated at build time.
 *
 * Next collects page data by importing every route and deciding whether the
 * handler is static, which means running it. Any route that opens the
 * database therefore ran during `next build` -- quietly creating and seeding
 * a file, and failing outright on a build that has no database to open.
 */
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    if (isShowcase()) {
      const product = staticProductBySlug(slug)
      return product
        ? NextResponse.json(product)
        : NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Get product with category name
    const product = await runGet<{ id: number; category_id: number | null }>(
      `
        SELECT
          p.*,
          c.name as category_name,
          c.slug as category_slug,
          c.parent_id as parent_category_id,
          pc.name as parent_category_name,
          pc.slug as parent_category_slug
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN categories pc ON c.parent_id = pc.id
        WHERE p.slug = ? AND p.is_active = 1
      `,
      [slug]
    )

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Both depend on the product and on nothing else, so they go together
    // rather than one after the other -- two round trips' latency, not four.
    const [images, relatedProducts] = await Promise.all([
      runQuery(
        `
        SELECT * FROM product_images
        WHERE product_id = ?
        ORDER BY display_order ASC, is_primary DESC
      `,
        [product.id]
      ),

      runQuery(
        `
        SELECT
          p.*,
          c.name as category_name,
          (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.category_id = ?
        AND p.id != ?
        AND p.is_active = 1
        ORDER BY p.is_featured DESC, p.created_at DESC
        LIMIT 4
      `,
        [product.category_id, product.id]
      ),
    ])

    return NextResponse.json({
      ...product,
      images,
      relatedProducts,
    })
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

