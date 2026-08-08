import { NextRequest, NextResponse } from 'next/server'
import { runGet, runQuery } from '@/lib/db'
import { localDate } from '@/lib/shop-time'

/**
 * Never evaluated at build time.
 *
 * Next collects page data by importing every route and deciding whether the
 * handler is static, which means running it. Any route that opens the
 * database therefore ran during `next build` -- quietly creating and seeding
 * a file, and failing outright on a build that has no database to open.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const type = searchParams.get('type') // 'store', 'billing', or 'all'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const paymentMethod = searchParams.get('paymentMethod')
    const search = searchParams.get('search') // Search by customer name or reference number

    const offset = (page - 1) * limit

    // Build WHERE clause
    const conditions: string[] = []
    const params: any[] = []

    if (type && type !== 'all') {
      conditions.push('transaction_type = ?')
      params.push(type)
    }

    if (startDate && endDate) {
      conditions.push(`${localDate('transaction_date')} BETWEEN CAST(? AS date) AND CAST(? AS date)`)
      params.push(startDate, endDate)
    }

    if (paymentMethod && paymentMethod !== 'all') {
      conditions.push('payment_method = ?')
      params.push(paymentMethod)
    }

    if (search) {
      // ILIKE, so searching a customer's name finds them whatever case the
      // cashier used when the sale was rung up.
      conditions.push('(customer_name ILIKE ? OR reference_number ILIKE ?)')
      const searchTerm = `%${search}%`
      params.push(searchTerm, searchTerm)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // The count and the page answer independent questions, so they go out
    // together rather than one waiting on the other.
    const [countResult, transactions] = await Promise.all([
      runGet<{ total: number }>(
        `
        SELECT COUNT(*) as total
        FROM revenue_transactions
        ${whereClause}
      `,
        params
      ),

      runQuery<any>(
        `
        SELECT
          id,
          transaction_type,
          reference_id,
          reference_number,
          customer_name,
          customer_email,
          customer_phone,
          subtotal,
          tax,
          discount,
          shipping_cost,
          total,
          payment_method,
          payment_status,
          notes,
          transaction_date,
          created_at
        FROM revenue_transactions
        ${whereClause}
        ORDER BY transaction_date DESC
        LIMIT ? OFFSET ?
      `,
        [...params, limit, offset]
      ),
    ])

    const totalPages = Math.ceil((countResult?.total ?? 0) / limit)

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          total: countResult?.total ?? 0,
          totalPages,
          hasMore: page < totalPages,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching revenue transactions:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch revenue transactions',
      },
      { status: 500 }
    )
  }
}
