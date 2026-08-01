import { NextRequest, NextResponse } from 'next/server'
import { getDb, runQuery, runInsert } from '@/lib/db'
import { Product, ProductFilter } from '@/types/product'
import { apiResponse, apiError, generateSKU, slugify } from '@/lib/utils'
import { isShowcase, staticProducts } from '@/lib/catalogue'

/**
 * Never evaluated at build time.
 *
 * Next collects page data by importing every route and deciding whether the
 * handler is static, which means running it. Any route that opens the
 * database therefore ran during `next build` -- quietly creating and seeding
 * a file, and failing outright on a build that has no database to open.
 */
export const dynamic = 'force-dynamic'

// GET /api/products - Get all products with filters
/** The same filters the SQL applies, over the static catalogue. */
const filterStatic = (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.max(1, Number(searchParams.get('limit') ?? 12))
  const search = searchParams.get('search')?.toLowerCase()
  const category = searchParams.get('category_id')
  const featured = searchParams.get('is_featured')
  const sortBy = searchParams.get('sort_by') ?? 'created_at'
  const ascending = searchParams.get('sort_order')?.toUpperCase() === 'ASC'

  let products = staticProducts()

  if (category) products = products.filter(item => String(item.category_id) === category)
  if (featured === 'true') products = products.filter(item => item.is_featured)
  if (search) {
    products = products.filter(item =>
      [item.name, item.description, item.sku].some(field =>
        field?.toLowerCase().includes(search)
      )
    )
  }

  const by: Record<string, (a: any, b: any) => number> = {
    name: (a, b) => a.name.localeCompare(b.name),
    price: (a, b) => a.price - b.price,
    stock: (a, b) => a.stock_quantity - b.stock_quantity,
    created_at: (a, b) => a.id - b.id,
  }
  products.sort(by[sortBy] ?? by.created_at)
  if (!ascending) products.reverse()

  const total = products.length
  return {
    products: products.slice((page - 1) * limit, page * limit),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  }
}

export async function GET(request: NextRequest) {
  try {
    /**
     * A storefront-only build serves the catalogue from the seed data.
     *
     * Filtering, sorting and paging happen here rather than in SQL, over
     * twenty products in memory. Doing it here keeps every client identical
     * between the two builds: the pages still call this route and still get
     * the same shape back.
     */
    if (isShowcase()) return NextResponse.json(apiResponse(filterStatic(request)))

    const { searchParams } = new URL(request.url)

    // Parse filters
    const filters: ProductFilter = {
      category_id: searchParams.get('category_id') ? parseInt(searchParams.get('category_id')!) : undefined,
      min_price: searchParams.get('min_price') ? parseFloat(searchParams.get('min_price')!) : undefined,
      max_price: searchParams.get('max_price') ? parseFloat(searchParams.get('max_price')!) : undefined,
      is_featured: searchParams.get('is_featured') === 'true' ? true : searchParams.get('is_featured') === 'false' ? false : undefined,
      is_active: searchParams.get('is_active') === 'false' ? false : true,
      search: searchParams.get('search') || undefined,
      sort_by: (searchParams.get('sort_by') as any) || 'created_at',
      sort_order: (searchParams.get('sort_order') as any) || 'desc',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '12'),
    }

    // Build SQL query
    let sql = `
      SELECT
        p.*,
        c.name as category_name,
        (SELECT COUNT(*) FROM product_images WHERE product_id = p.id) as image_count,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `

    const params: any[] = []

    if (filters.is_active !== undefined) {
      sql += ' AND p.is_active = ?'
      params.push(filters.is_active ? 1 : 0)
    }

    if (filters.category_id !== undefined) {
      sql += ' AND p.category_id = ?'
      params.push(filters.category_id)
    }

    if (filters.min_price !== undefined) {
      sql += ' AND p.price >= ?'
      params.push(filters.min_price)
    }

    if (filters.max_price !== undefined) {
      sql += ' AND p.price <= ?'
      params.push(filters.max_price)
    }

    if (filters.is_featured !== undefined) {
      sql += ' AND p.is_featured = ?'
      params.push(filters.is_featured ? 1 : 0)
    }

    if (filters.search) {
      sql += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)'
      const searchTerm = `%${filters.search}%`
      params.push(searchTerm, searchTerm, searchTerm)
    }

    /**
     * Both halves of the ORDER BY come from a fixed set.
     *
     * The column already did; the direction did not -- `sort_order` went into
     * the statement exactly as the query string supplied it. better-sqlite3
     * refuses multiple statements, so the classic `; DROP TABLE` does not
     * land, but an unbounded expression in an ORDER BY on a public endpoint
     * is still an injection point, and the least it buys an attacker is a 500
     * from any request they like.
     */
    const sortColumn = filters.sort_by === 'name' ? 'p.name' :
                      filters.sort_by === 'price' ? 'p.price' :
                      filters.sort_by === 'stock' ? 'p.stock_quantity' :
                      'p.created_at'
    const sortDirection = String(filters.sort_order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    sql += ` ORDER BY ${sortColumn} ${sortDirection}`

    // Add pagination
    const offset = (filters.page! - 1) * filters.limit!
    sql += ' LIMIT ? OFFSET ?'
    params.push(filters.limit, offset)

    const products = runQuery<Product>(sql, params)

    // Get total count
    let countSql = `
      SELECT COUNT(*) as total
      FROM products p
      WHERE 1=1
    `
    const countParams: any[] = []

    if (filters.is_active !== undefined) {
      countSql += ' AND p.is_active = ?'
      countParams.push(filters.is_active ? 1 : 0)
    }

    if (filters.category_id !== undefined) {
      countSql += ' AND p.category_id = ?'
      countParams.push(filters.category_id)
    }

    if (filters.min_price !== undefined) {
      countSql += ' AND p.price >= ?'
      countParams.push(filters.min_price)
    }

    if (filters.max_price !== undefined) {
      countSql += ' AND p.price <= ?'
      countParams.push(filters.max_price)
    }

    if (filters.is_featured !== undefined) {
      countSql += ' AND p.is_featured = ?'
      countParams.push(filters.is_featured ? 1 : 0)
    }

    if (filters.search) {
      countSql += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)'
      const searchTerm = `%${filters.search}%`
      countParams.push(searchTerm, searchTerm, searchTerm)
    }

    const countResult = runQuery<{ total: number }>(countSql, countParams)
    const total = countResult[0]?.total || 0

    // Get images for each product
    const productsWithImages = products.map(product => {
      const images = runQuery<any>(
        'SELECT * FROM product_images WHERE product_id = ? ORDER BY display_order',
        [product.id]
      )
      return {
        ...product,
        images
      }
    })

    return NextResponse.json(
      apiResponse({
        products: productsWithImages,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total,
          totalPages: Math.ceil(total / filters.limit!)
        }
      })
    )
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      apiError('Failed to fetch products'),
      { status: 500 }
    )
  }
}

// POST /api/products - Create new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const db = getDb()

    // Validate required fields
    if (!body.name || !body.price || !body.category_id) {
      return NextResponse.json(
        apiError('Missing required fields'),
        { status: 400 }
      )
    }

    // Generate slug and SKU if not provided
    const slug = body.slug || slugify(body.name)
    const sku = body.sku || generateSKU(body.name)

    // Check if slug or SKU already exists
    const existing = db.prepare(
      'SELECT id FROM products WHERE slug = ? OR sku = ?'
    ).get(slug, sku)

    if (existing) {
      return NextResponse.json(
        apiError('Product with this slug or SKU already exists'),
        { status: 400 }
      )
    }

    // Insert product
    const sql = `
      INSERT INTO products (
        name, slug, description, long_description, sku, category_id,
        price, compare_at_price, cost_price, stock_quantity,
        low_stock_threshold, is_featured, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    const stmt = db.prepare(sql)
    const result = stmt.run(
      body.name,
      slug,
      body.description || null,
      body.long_description || null,
      sku,
      body.category_id,
      body.price,
      body.compare_at_price || null,
      body.cost_price || null,
      body.stock_quantity || 0,
      body.low_stock_threshold || 5,
      body.is_featured ? 1 : 0,
      body.is_active !== false ? 1 : 0
    )

    const productId = result.lastInsertRowid

    // Add images if provided
    if (body.images && Array.isArray(body.images)) {
      const insertImage = db.prepare(`
        INSERT INTO product_images (
          product_id, image_url, alt_text, display_order, is_primary
        ) VALUES (?, ?, ?, ?, ?)
      `)

      body.images.forEach((image: any, index: number) => {
        insertImage.run(
          productId,
          image.image_url,
          image.alt_text || body.name,
          image.display_order || index,
          index === 0 ? 1 : 0
        )
      })
    }

    // Fetch the created product
    const product = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(productId)

    return NextResponse.json(
      apiResponse(product),
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      apiError('Failed to create product'),
      { status: 500 }
    )
  }
}