import { NextRequest, NextResponse } from 'next/server'
import { runDelete, runGet } from '@/lib/db'

/**
 * Never evaluated at build time.
 *
 * Next collects page data by importing every route and deciding whether the
 * handler is static, which means running it. Any route that opens the
 * database therefore ran during `next build` -- quietly creating and seeding
 * a file, and failing outright on a build that has no database to open.
 */
export const dynamic = 'force-dynamic'

const notFound = () =>
  NextResponse.json({ success: false, error: 'Navigation item not found' }, { status: 404 })

// GET /api/nav/[id] - Get single navigation item
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const item = await runGet('SELECT * FROM nav_items WHERE id = ?', [Number(params.id)])

    if (!item) return notFound()

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

    /**
     * One statement, not three.
     *
     * This used to check the row existed, update it, then read it back. Over
     * a network that is three round trips where RETURNING gives the same
     * answer in one -- and it closes the gap where another administrator
     * could delete the item between the check and the write.
     */
    const updated = await runGet(
      `
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
      RETURNING *
    `,
      [
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
        Number(params.id),
      ]
    )

    if (!updated) return notFound()

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
    const removed = await runDelete('DELETE FROM nav_items WHERE id = ?', [Number(params.id)])

    if (removed === 0) return notFound()

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
