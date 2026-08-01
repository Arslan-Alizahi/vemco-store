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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'month' // day, week, month, year
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const type = searchParams.get('type') // 'store' or 'billing' or 'all'

    const db = getDb()

    /**
     * Values are bound; only fixed fragments are ever concatenated.
     *
     * Every one of startDate, endDate and type used to be pasted straight
     * into the statement from the query string. This route sits behind a
     * session now, which lowers the stakes, but "only an administrator can
     * inject SQL" is not a property worth relying on.
     */
    const filterParams: unknown[] = []
    let dateFilter: string

    if (startDate && endDate) {
      dateFilter = 'WHERE DATE(transaction_date) BETWEEN DATE(?) AND DATE(?)'
      filterParams.push(startDate, endDate)
    } else {
      const WINDOWS: Record<string, string> = {
        day: '-30 days',
        week: '-12 weeks',
        month: '-12 months',
        year: '-5 years',
      }
      dateFilter = "WHERE DATE(transaction_date) >= DATE('now', ?)"
      filterParams.push(WINDOWS[period] ?? WINDOWS.month)
    }

    if (type && type !== 'all') {
      dateFilter += ' AND transaction_type = ?'
      filterParams.push(type)
    }

    // Get revenue over time based on period
    let groupByFormat = ''
    switch (period) {
      case 'day':
        groupByFormat = '%Y-%m-%d'
        break
      case 'week':
        groupByFormat = '%Y-W%W'
        break
      case 'month':
        groupByFormat = '%Y-%m'
        break
      case 'year':
        groupByFormat = '%Y'
        break
      default:
        groupByFormat = '%Y-%m'
    }

    const revenueOverTime = db
      .prepare(
        `
        SELECT
          strftime('${groupByFormat}', transaction_date) as period,
          COALESCE(SUM(total), 0) as revenue,
          COALESCE(SUM(subtotal), 0) as subtotal,
          COALESCE(SUM(tax), 0) as tax,
          COALESCE(SUM(discount), 0) as discount,
          COUNT(*) as transactions
        FROM revenue_transactions
        ${dateFilter}
        GROUP BY period
        ORDER BY period ASC
      `
      )
      .all(...filterParams) as any[]

    // Get revenue by source over time
    const revenueBySource = db
      .prepare(
        `
        SELECT
          strftime('${groupByFormat}', transaction_date) as period,
          transaction_type,
          COALESCE(SUM(total), 0) as revenue,
          COUNT(*) as transactions
        FROM revenue_transactions
        ${dateFilter}
        GROUP BY period, transaction_type
        ORDER BY period ASC, transaction_type
      `
      )
      .all(...filterParams) as any[]

    // Get top performing days
    const topDays = db
      .prepare(
        `
        SELECT
          DATE(transaction_date) as date,
          COALESCE(SUM(total), 0) as revenue,
          COUNT(*) as transactions
        FROM revenue_transactions
        ${dateFilter}
        GROUP BY date
        ORDER BY revenue DESC
        LIMIT 10
      `
      )
      .all(...filterParams) as any[]

    // Get revenue by payment method over period
    const paymentMethodTrends = db
      .prepare(
        `
        SELECT
          payment_method,
          COALESCE(SUM(total), 0) as revenue,
          COUNT(*) as transactions
        FROM revenue_transactions
        ${dateFilter}
        GROUP BY payment_method
        ORDER BY revenue DESC
      `
      )
      .all(...filterParams) as any[]

    // Get daily averages
    const avgDaily = db
      .prepare(
        `
        SELECT
          AVG(daily_revenue) as avg_revenue,
          AVG(daily_transactions) as avg_transactions
        FROM (
          SELECT
            DATE(transaction_date) as date,
            SUM(total) as daily_revenue,
            COUNT(*) as daily_transactions
          FROM revenue_transactions
          ${dateFilter}
          GROUP BY date
        )
      `
      )
      .get(...filterParams) as any

    return NextResponse.json({
      success: true,
      data: {
        period,
        revenueOverTime,
        revenueBySource,
        topDays,
        paymentMethodTrends,
        averages: {
          dailyRevenue: avgDaily?.avg_revenue || 0,
          dailyTransactions: avgDaily?.avg_transactions || 0,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching revenue analytics:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch revenue analytics',
      },
      { status: 500 }
    )
  }
}
