import { NextRequest, NextResponse } from 'next/server'
import { runGet, runQuery } from '@/lib/db'
import { Category } from '@/types/category'
import { apiResponse, apiError, slugify, buildCategoryTree } from '@/lib/utils'
import { isShowcase, staticCategories } from '@/lib/catalogue'

/**
 * Never evaluated at build time.
 *
 * Next collects page data by importing every route and deciding whether the
 * handler is static, which means running it. Any route that opens the
 * database therefore ran during `next build` -- quietly creating and seeding
 * a file, and failing outright on a build that has no database to open.
 */
export const dynamic = 'force-dynamic'

// GET /api/categories - Get all categories
export async function GET(request: NextRequest) {
  try {
    if (isShowcase()) return NextResponse.json(apiResponse(staticCategories()))

    const { searchParams } = new URL(request.url)
    const tree = searchParams.get('tree') === 'true'
    const parent_id = searchParams.get('parent_id')
    const is_active = searchParams.get('is_active')

    let sql = `
      SELECT
        c.*,
        p.name as parent_name,
        (SELECT COUNT(*) FROM products WHERE category_id = c.id) as product_count
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE 1=1
    `
    const params: any[] = []

    if (parent_id !== null) {
      /**
       * `?parent_id=null` means top-level, and `= NULL` is never true of
       * anything -- so that branch used to return an empty list rather than
       * the root categories it was asked for. Same in SQLite; it just went
       * unnoticed because the admin rarely passes it.
       */
      if (parent_id === 'null') {
        sql += ' AND c.parent_id IS NULL'
      } else {
        sql += ' AND c.parent_id = ?'
        params.push(parseInt(parent_id))
      }
    }

    if (is_active !== null) {
      sql += ' AND c.is_active = ?'
      params.push(is_active === 'true' ? 1 : 0)
    }

    sql += ' ORDER BY c.display_order, c.name'

    const categories = await runQuery<Category>(sql, params)

    if (tree) {
      const categoryTree = buildCategoryTree(categories)
      return NextResponse.json(apiResponse(categoryTree))
    }

    return NextResponse.json(apiResponse(categories))
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      apiError('Failed to fetch categories'),
      { status: 500 }
    )
  }
}

// POST /api/categories - Create new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        apiError('Category name is required'),
        { status: 400 }
      )
    }

    // Generate slug if not provided
    const slug = body.slug || slugify(body.name)

    /**
     * The unique index decides, not a prior SELECT.
     *
     * Checking first and inserting second leaves a window where two requests
     * both find the slug free and both try to take it -- and the loser used
     * to surface as a 500 rather than the clear message this returns.
     * ON CONFLICT DO NOTHING makes the database the arbiter: no row back
     * means the slug was taken.
     */
    const created = await runGet<{ id: number }>(
      `
      INSERT INTO categories (
        name, slug, description, parent_id, image_url,
        display_order, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (slug) DO NOTHING
      RETURNING id
    `,
      [
        body.name,
        slug,
        body.description || null,
        body.parent_id || null,
        body.image_url || null,
        body.display_order || 0,
        body.is_active !== false ? 1 : 0,
      ]
    )

    if (!created) {
      return NextResponse.json(
        apiError('Category with this slug already exists'),
        { status: 400 }
      )
    }

    // Read back with the parent name joined on, which the insert cannot give.
    const category = await runGet(
      `
      SELECT c.*, p.name as parent_name
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.id = ?
    `,
      [created.id]
    )

    return NextResponse.json(
      apiResponse(category),
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      apiError('Failed to create category'),
      { status: 500 }
    )
  }
}