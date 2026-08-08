import { NextRequest, NextResponse } from 'next/server'
import { runGet, runQuery } from '@/lib/db'
import { NOW_LOCAL, SHOP_TIMEZONE, localDate } from '@/lib/shop-time'

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

    const DAY_OF_ROW = localDate('transaction_date')

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
      dateFilter = `WHERE ${DAY_OF_ROW} BETWEEN CAST(? AS date) AND CAST(? AS date)`
      filterParams.push(startDate, endDate)
    } else {
      /**
       * Positive intervals, subtracted in SQL.
       *
       * Postgres will not take a placeholder directly after INTERVAL -- the
       * keyword expects a literal -- so the window arrives as text and is
       * cast. Which also means the leading minus has to move out of the
       * value and into the expression.
       */
      const WINDOWS: Record<string, string> = {
        day: '30 days',
        week: '12 weeks',
        month: '12 months',
        year: '5 years',
      }
      dateFilter = `WHERE ${DAY_OF_ROW} >= ${NOW_LOCAL}::date - CAST(? AS interval)`
      filterParams.push(WINDOWS[period] ?? WINDOWS.month)
    }

    if (type && type !== 'all') {
      dateFilter += ' AND transaction_type = ?'
      filterParams.push(type)
    }

    /**
     * How the rows are bucketed on the chart.
     *
     * to_char patterns, not strftime ones. The week format is ISO -- IYYY
     * with IW -- because %W counted a partial first week as week zero and
     * paired it with the calendar year, so the first days of January were
     * filed under a week that the following December also claimed.
     */
    const FORMATS: Record<string, string> = {
      day: 'YYYY-MM-DD',
      week: 'IYYY-"W"IW',
      month: 'YYYY-MM',
      year: 'YYYY',
    }
    const groupByFormat = FORMATS[period] ?? FORMATS.month
    const BUCKET = `to_char(transaction_date AT TIME ZONE '${SHOP_TIMEZONE}', '${groupByFormat}')`

    // Five aggregates over the same filtered set, none depending on another.
    const [revenueOverTime, revenueBySource, topDays, paymentMethodTrends, avgDaily] =
      await Promise.all([
        // Revenue over time
        runQuery<any>(
          `
        SELECT
          ${BUCKET} as period,
          COALESCE(SUM(total), 0) as revenue,
          COALESCE(SUM(subtotal), 0) as subtotal,
          COALESCE(SUM(tax), 0) as tax,
          COALESCE(SUM(discount), 0) as discount,
          COUNT(*) as transactions
        FROM revenue_transactions
        ${dateFilter}
        GROUP BY period
        ORDER BY period ASC
      `,
          filterParams
        ),

        // Revenue by source over time
        runQuery<any>(
          `
        SELECT
          ${BUCKET} as period,
          transaction_type,
          COALESCE(SUM(total), 0) as revenue,
          COUNT(*) as transactions
        FROM revenue_transactions
        ${dateFilter}
        GROUP BY period, transaction_type
        ORDER BY period ASC, transaction_type
      `,
          filterParams
        ),

        // Top performing days
        runQuery<any>(
          `
        SELECT
          ${DAY_OF_ROW} as date,
          COALESCE(SUM(total), 0) as revenue,
          COUNT(*) as transactions
        FROM revenue_transactions
        ${dateFilter}
        GROUP BY date
        ORDER BY revenue DESC
        LIMIT 10
      `,
          filterParams
        ),

        // Revenue by payment method over the period
        runQuery<any>(
          `
        SELECT
          payment_method,
          COALESCE(SUM(total), 0) as revenue,
          COUNT(*) as transactions
        FROM revenue_transactions
        ${dateFilter}
        GROUP BY payment_method
        ORDER BY revenue DESC
      `,
          filterParams
        ),

        // Daily averages. The subquery needs a name in Postgres.
        runGet<any>(
          `
        SELECT
          AVG(daily_revenue) as avg_revenue,
          AVG(daily_transactions) as avg_transactions
        FROM (
          SELECT
            ${DAY_OF_ROW} as date,
            SUM(total) as daily_revenue,
            COUNT(*) as daily_transactions
          FROM revenue_transactions
          ${dateFilter}
          GROUP BY date
        ) AS daily
      `,
          filterParams
        ),
      ])

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
