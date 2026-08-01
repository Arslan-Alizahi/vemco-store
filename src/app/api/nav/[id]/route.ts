import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

/**
 * Never evaluated at build time.
 *
 * Next collects page data by importing every route and deciding whether the
 * handler is static, which means running it. Any route that opens the
 * database therefore ran during `next build` -- quietly creating and seeding
 * a file, and failing outright on a build that has no database to open.
 */
export const dynamic = 'force-dynamic'

// GET /api/nav/[id] - Get single navigation item
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb()
    const item = db
      .prepare('SELECT * FROM nav_items WHERE id = ?')
      .get(params.id)

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Navigation item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: item,
    })
  } catch (error) {
    console.error('Error fetching nav item:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch navigation item' },
      { status: 500 }
    )
  }
}

// PUT /api/nav/[id] - Update navigation item
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const db = getDb()

    // Check if item exists
    const existing = db
      .prepare('SELECT id FROM nav_items WHERE id = ?')
      .get(params.id)

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Navigation item not found' },
        { status: 404 }
      )
    }

    const sql = `
      UPDATE nav_items SET
        label = ?,
        href = ?,
        parent_id = ?,
        type = ?,
        target = ?,
        icon = ?,
        display_order = ?,
        is_active = ?,
        location = ?,
        meta = ?
      WHERE id = ?
    `

    const stmt = db.prepare(sql)
    stmt.run(
      body.label,
      body.href,
      body.parent_id || null,
      body.type || 'link',
      body.target || '_self',
      body.icon || null,
      body.display_order || 0,
      body.is_active ? 1 : 0,
      body.location || 'header',
      body.meta ? JSON.stringify(body.meta) : null,
      params.id
    )

    const updated = db
      .prepare('SELECT * FROM nav_items WHERE id = ?')
      .get(params.id)

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Navigation item updated successfully',
    })
  } catch (error) {
    console.error('Error updating nav item:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update navigation item' },
      { status: 500 }
    )
  }
}

// DELETE /api/nav/[id] - Delete navigation item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb()

    // Check if item exists
    const existing = db
      .prepare('SELECT id FROM nav_items WHERE id = ?')
      .get(params.id)

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Navigation item not found' },
        { status: 404 }
      )
    }

    db.prepare('DELETE FROM nav_items WHERE id = ?').run(params.id)

    return NextResponse.json({
      success: true,
      message: 'Navigation item deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting nav item:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete navigation item' },
      { status: 500 }
    )
  }
}

