import { NextRequest, NextResponse } from 'next/server'
import { runDelete, runGet } from '@/lib/db'
import { apiResponse, apiError } from '@/lib/utils'
import type { UpdateSocialMediaLinkInput } from '@/types/social-media'

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
  NextResponse.json(apiError('Social media link not found'), { status: 404 })

// GET /api/social-media/[id] - Get single social media link
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const link = await runGet('SELECT * FROM social_media_links WHERE id = ?', [Number(params.id)])

    if (!link) return notFound()

    return NextResponse.json(apiResponse(link))
  } catch (error) {
    console.error('Error fetching social media link:', error)
    return NextResponse.json(apiError('Failed to fetch social media link'), {
      status: 500,
    })
  }
}

// PUT /api/social-media/[id] - Update social media link
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: UpdateSocialMediaLinkInput = await request.json()

    // Build update query
    const updates: string[] = []
    const values: any[] = []

    if (body.platform !== undefined) {
      updates.push('platform = ?')
      values.push(body.platform)
    }
    if (body.url !== undefined) {
      updates.push('url = ?')
      values.push(body.url)
    }
    if (body.icon !== undefined) {
      updates.push('icon = ?')
      values.push(body.icon)
    }
    if (body.display_order !== undefined) {
      updates.push('display_order = ?')
      values.push(body.display_order)
    }
    if (body.is_active !== undefined) {
      updates.push('is_active = ?')
      values.push(body.is_active)
    }

    if (updates.length === 0) {
      return NextResponse.json(apiError('No fields to update'), { status: 400 })
    }

    values.push(Number(params.id))

    // RETURNING is both the update and the existence check: no rows back
    // means there was no such link, without a separate query to find out.
    const updatedLink = await runGet(
      `UPDATE social_media_links SET ${updates.join(', ')} WHERE id = ? RETURNING *`,
      values
    )

    if (!updatedLink) return notFound()

    return NextResponse.json(apiResponse(updatedLink, true, 'Social media link updated successfully'))
  } catch (error) {
    console.error('Error updating social media link:', error)
    return NextResponse.json(apiError('Failed to update social media link'), {
      status: 500,
    })
  }
}

// DELETE /api/social-media/[id] - Delete social media link
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const removed = await runDelete('DELETE FROM social_media_links WHERE id = ?', [
      Number(params.id),
    ])

    if (removed === 0) return notFound()

    return NextResponse.json(apiResponse(null, true, 'Social media link deleted successfully'))
  } catch (error) {
    console.error('Error deleting social media link:', error)
    return NextResponse.json(apiError('Failed to delete social media link'), {
      status: 500,
    })
  }
}
