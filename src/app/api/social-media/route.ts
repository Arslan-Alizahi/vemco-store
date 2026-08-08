import { NextRequest, NextResponse } from 'next/server'
import { runGet, runQuery } from '@/lib/db'
import { apiResponse, apiError } from '@/lib/utils'
import type { CreateSocialMediaLinkInput } from '@/types/social-media'

/**
 * Never evaluated at build time.
 *
 * Next collects page data by importing every route and deciding whether the
 * handler is static, which means running it. Any route that opens the
 * database therefore ran during `next build` -- quietly creating and seeding
 * a file, and failing outright on a build that has no database to open.
 */
export const dynamic = 'force-dynamic'

// GET /api/social-media - Get all social media links
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active_only') === 'true'

    let query = `
      SELECT *
      FROM social_media_links
    `

    const conditions = []
    if (activeOnly) {
      conditions.push('is_active = 1')
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' ORDER BY display_order ASC'

    const links = await runQuery(query)

    return NextResponse.json(
      apiResponse({
        links,
        total: links.length,
      })
    )
  } catch (error) {
    console.error('Error fetching social media links:', error)
    return NextResponse.json(apiError('Failed to fetch social media links'), {
      status: 500,
    })
  }
}

// POST /api/social-media - Create new social media link
export async function POST(request: NextRequest) {
  try {
    const body: CreateSocialMediaLinkInput = await request.json()

    // Validation
    if (!body.platform || !body.url || !body.icon) {
      return NextResponse.json(
        apiError('Platform, URL, and icon are required'),
        { status: 400 }
      )
    }

    const newLink = await runGet(
      `
      INSERT INTO social_media_links (platform, url, icon, display_order, is_active)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `,
      [body.platform, body.url, body.icon, body.display_order ?? 0, body.is_active ?? 1]
    )

    return NextResponse.json(apiResponse(newLink, true, 'Social media link created successfully'), {
      status: 201,
    })
  } catch (error) {
    console.error('Error creating social media link:', error)
    return NextResponse.json(apiError('Failed to create social media link'), {
      status: 500,
    })
  }
}
