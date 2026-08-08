import { NextRequest, NextResponse } from 'next/server'
import { runDelete, runGet, runTransaction, runUpdate } from '@/lib/db'
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

const WITH_PARENT = `
  SELECT c.*, p.name as parent_name
  FROM categories c
  LEFT JOIN categories p ON c.parent_id = p.id
`

const notFound = () => NextResponse.json(apiError('Category not found'), { status: 404 })

// GET /api/categories/[id] - Get single category
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const identifier = params.id
    const isNumeric = /^\d+$/.test(identifier)

    const category = await runGet(
      `${WITH_PARENT} WHERE ${isNumeric ? 'c.id' : 'c.slug'} = ?`,
      [isNumeric ? parseInt(identifier) : identifier]
    )

    if (!category) return notFound()

    return NextResponse.json(apiResponse(category))
  } catch (error) {
    console.error('Error fetching category:', error)
    return NextResponse.json(
      apiError('Failed to fetch category'),
      { status: 500 }
    )
  }
}

// PUT /api/categories/[id] - Update category
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const categoryId = parseInt(params.id)

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

    if (body.parent_id !== undefined) {
      updates.push('parent_id = ?')
      values.push(body.parent_id)
    }

    if (body.image_url !== undefined) {
      updates.push('image_url = ?')
      values.push(body.image_url)
    }

    if (body.display_order !== undefined) {
      updates.push('display_order = ?')
      values.push(body.display_order)
    }

    if (body.is_active !== undefined) {
      updates.push('is_active = ?')
      values.push(body.is_active ? 1 : 0)
    }

    if (updates.length > 0) {
      const changed = await runUpdate(
        `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
        [...values, categoryId]
      )
      if (changed === 0) return notFound()
    }

    const category = await runGet(`${WITH_PARENT} WHERE c.id = ?`, [categoryId])
    if (!category) return notFound()

    return NextResponse.json(apiResponse(category))
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json(
      apiError('Failed to update category'),
      { status: 500 }
    )
  }
}

// DELETE /api/categories/[id] - Delete category
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = parseInt(params.id)

    /**
     * All three writes or none.
     *
     * Detaching the products, detaching the child categories and removing the
     * row were three separate statements. Against a local file they could not
     * realistically be interrupted between; against a network they can, and
     * the half-done state is products pointing at a category that no longer
     * exists.
     */
    const removed = await runTransaction(async tx => {
      await runUpdate('UPDATE products SET category_id = NULL WHERE category_id = ?', [categoryId], tx)
      await runUpdate('UPDATE categories SET parent_id = NULL WHERE parent_id = ?', [categoryId], tx)
      return runDelete('DELETE FROM categories WHERE id = ?', [categoryId], tx)
    })

    if (removed === 0) return notFound()

    return NextResponse.json(apiResponse({ message: 'Category deleted successfully' }))
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      apiError('Failed to delete category'),
      { status: 500 }
    )
  }
}
