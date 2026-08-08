import { NextResponse } from 'next/server'
import { runGet } from '@/lib/db'
import { clearDemoData, hasDemoData, seedDemoData } from '@/lib/db/seed'
import { apiError, apiResponse } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/** GET /api/admin/demo-data - is the demo catalogue currently loaded? */
export async function GET() {
  try {
    const [row, present] = await Promise.all([
      runGet<{ count: number }>('SELECT COUNT(*) as count FROM products'),
      hasDemoData(),
    ])

    return NextResponse.json(
      apiResponse({ present, productCount: row?.count ?? 0 })
    )
  } catch (error) {
    console.error('Error reading demo data status:', error)
    return NextResponse.json(apiError('Failed to read demo data status'), { status: 500 })
  }
}

/** POST /api/admin/demo-data - load the demo catalogue. */
export async function POST() {
  try {
    const { seeded, products } = await seedDemoData()

    return NextResponse.json(
      apiResponse(
        { seeded, products },
        true,
        seeded ? `Seeded ${products} demo products` : 'Demo data is already loaded'
      )
    )
  } catch (error: any) {
    console.error('Error seeding demo data:', error)
    return NextResponse.json(apiError(error.message || 'Failed to seed demo data'), {
      status: 500,
    })
  }
}

/**
 * DELETE /api/admin/demo-data - remove the demo catalogue.
 *
 * Only rows recorded in the demo_seed ledger are deleted, so anything the
 * operator added themselves survives.
 */
export async function DELETE() {
  try {
    const removed = await clearDemoData()
    const total = Object.values(removed).reduce((sum, n) => sum + n, 0)

    return NextResponse.json(
      apiResponse({ removed }, true, `Removed ${total} demo records`)
    )
  } catch (error: any) {
    console.error('Error clearing demo data:', error)
    return NextResponse.json(apiError(error.message || 'Failed to clear demo data'), {
      status: 500,
    })
  }
}
