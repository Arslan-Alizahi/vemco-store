import { NextRequest, NextResponse } from 'next/server'
import { runDelete, runGet, runQuery, runTransaction, runUpdate } from '@/lib/db'
import { apiResponse, apiError, slugify } from '@/lib/utils'

/**
 * Never evaluated at build time.
 *
 * Next collects page data by importing every route and deciding whether the
 * handler is static, which means running it. Any route that opens the
 * database therefore ran during `next build` -- quietly creating and seeding
 * a file, and failing outright on a build that has no database to open.
 */
export const dynamic = 'force-dynamic'

// GET /api/products/[id] - Get single product by ID or slug
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const identifier = params.id

    // Check if identifier is numeric (ID) or string (slug)
    const isNumeric = /^\d+$/.test(identifier)

    const product = await runGet<{ id: number; category_id: number | null }>(
      `
      SELECT
        p.*,
        c.name as category_name,
        c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ${isNumeric ? 'p.id' : 'p.slug'} = ?
    `,
      [isNumeric ? parseInt(identifier) : identifier]
    )

    if (!product) {
      return NextResponse.json(
        apiError('Product not found'),
        { status: 404 }
      )
    }

    const [images, relatedProducts] = await Promise.all([
      runQuery<any>(
        'SELECT * FROM product_images WHERE product_id = ? ORDER BY display_order',
        [product.id]
      ),

      // Related products: same category, different product
      runQuery<any>(
        `SELECT p.*,
          (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
         FROM products p
         WHERE p.category_id = ? AND p.id != ? AND p.is_active = 1
         ORDER BY RANDOM()
         LIMIT 4`,
        [product.category_id, product.id]
      ),
    ])

    return NextResponse.json(
      apiResponse({
        ...product,
        images,
        related_products: relatedProducts
      })
    )
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      apiError('Failed to fetch product'),
      { status: 500 }
    )
  }
}

// PUT /api/products/[id] - Update product
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const productId = parseInt(params.id)

    // Build update query
    const updates: string[] = []
    const values: any[] = []

    if (body.name !== undefined) {
      updates.push('name = ?')
      values.push(body.name)
      if (!body.slug) {
        updates.push('slug = ?')
        values.push(slugify(body.name))
      }
    }

    if (body.slug !== undefined) {
      updates.push('slug = ?')
      values.push(body.slug)
    }

    if (body.description !== undefined) {
      updates.push('description = ?')
      values.push(body.description)
    }

    if (body.long_description !== undefined) {
      updates.push('long_description = ?')
      values.push(body.long_description)
    }

    if (body.sku !== undefined) {
      updates.push('sku = ?')
      values.push(body.sku)
    }

    if (body.category_id !== undefined) {
      updates.push('category_id = ?')
      values.push(body.category_id)
    }

    if (body.price !== undefined) {
      updates.push('price = ?')
      values.push(body.price)
    }

    if (body.compare_at_price !== undefined) {
      updates.push('compare_at_price = ?')
      values.push(body.compare_at_price)
    }

    if (body.cost_price !== undefined) {
      updates.push('cost_price = ?')
      values.push(body.cost_price)
    }

    if (body.stock_quantity !== undefined) {
      updates.push('stock_quantity = ?')
      values.push(body.stock_quantity)
    }

    if (body.low_stock_threshold !== undefined) {
      updates.push('low_stock_threshold = ?')
      values.push(body.low_stock_threshold)
    }

    if (body.is_featured !== undefined) {
      updates.push('is_featured = ?')
      values.push(body.is_featured ? 1 : 0)
    }

    if (body.is_active !== undefined) {
      updates.push('is_active = ?')
      values.push(body.is_active ? 1 : 0)
    }

    /**
     * The fields and the photographs move together.
     *
     * Replacing the images is a delete followed by inserts, and outside a
     * transaction a failure between the two leaves a product with no images
     * at all -- the listing renders it as an empty grey box, and the
     * originals are gone.
     */
    const found = await runTransaction(async tx => {
      let exists = true

      if (updates.length > 0) {
        exists =
          (await runUpdate(
            `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
            [...values, productId],
            tx
          )) > 0
      } else {
        exists = Boolean(await runGet('SELECT id FROM products WHERE id = ?', [productId], tx))
      }

      if (!exists) return false

      // Update images if provided
      if (body.images && Array.isArray(body.images)) {
        await runDelete('DELETE FROM product_images WHERE product_id = ?', [productId], tx)

        for (const [index, image] of body.images.entries()) {
          await runGet(
            `
        INSERT INTO product_images (
          product_id, image_url, alt_text, display_order, is_primary
        ) VALUES (?, ?, ?, ?, ?)
      `,
            [
              productId,
              image.image_url,
              image.alt_text || body.name || 'Product image',
              image.display_order || index,
              index === 0 ? 1 : 0,
            ],
            tx
          )
        }
      }

      return true
    })

    if (!found) {
      return NextResponse.json(
        apiError('Product not found'),
        { status: 404 }
      )
    }

    // Fetch updated product
    const product = await runGet(
      `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `,
      [productId]
    )

    return NextResponse.json(apiResponse(product))
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      apiError('Failed to update product'),
      { status: 500 }
    )
  }
}

// DELETE /api/products/[id] - Delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = parseInt(params.id)

    // Images cascade with the product, so this is the only statement needed.
    const removed = await runDelete('DELETE FROM products WHERE id = ?', [productId])

    if (removed === 0) {
      return NextResponse.json(
        apiError('Product not found'),
        { status: 404 }
      )
    }

    return NextResponse.json(apiResponse({ message: 'Product deleted successfully' }))
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      apiError('Failed to delete product'),
      { status: 500 }
    )
  }
}