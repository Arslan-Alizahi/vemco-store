import { NextResponse } from 'next/server'
import { runGet, runQuery } from '@/lib/db'
import { NOW_LOCAL, localDate, localTrunc } from '@/lib/shop-time'

/**
 * Never evaluated at build time.
 *
 * Next collects page data by importing every route and deciding whether the
 * handler is static, which means running it. Any route that opens the
 * database therefore ran during `next build` -- quietly creating and seeding
 * a file, and failing outright on a build that has no database to open.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const DATE_OF_ROW = localDate('transaction_date')
    const MONTH_OF_ROW = localTrunc('month', 'transaction_date')
    const YEAR_OF_ROW = localTrunc('year', 'transaction_date')

    /**
     * Nine independent aggregates over one table.
     *
     * They were nine sequential statements, which cost nothing against a
     * local file and nine round trips to Mumbai here -- on the page the shop
     * opens first every morning. None of them depends on another, so they all
     * go at once.
     */
    const [
      totalRevenue,
      revenueBySource,
      todayRevenue,
      monthRevenue,
      yearRevenue,
      yesterdayRevenue,
      lastMonthRevenue,
      paymentMethods,
      recentTransactions,
    ] = await Promise.all([
      // Total revenue (all time)
      runGet<any>(`
        SELECT
          COALESCE(SUM(total), 0) as total,
          COALESCE(SUM(subtotal), 0) as subtotal,
          COALESCE(SUM(tax), 0) as tax,
          COALESCE(SUM(discount), 0) as discount,
          COUNT(*) as transaction_count
        FROM revenue_transactions
      `),

      // Revenue by source
      runQuery<any>(`
        SELECT
          transaction_type,
          COALESCE(SUM(total), 0) as total,
          COUNT(*) as transaction_count
        FROM revenue_transactions
        GROUP BY transaction_type
      `),

      // Today, in the shop's own day rather than UTC's
      runGet<any>(`
        SELECT
          COALESCE(SUM(total), 0) as total,
          COUNT(*) as transaction_count
        FROM revenue_transactions
        WHERE ${DATE_OF_ROW} = ${NOW_LOCAL}::date
      `),

      // This month
      runGet<any>(`
        SELECT
          COALESCE(SUM(total), 0) as total,
          COUNT(*) as transaction_count
        FROM revenue_transactions
        WHERE ${MONTH_OF_ROW} = date_trunc('month', ${NOW_LOCAL})
      `),

      // This year
      runGet<any>(`
        SELECT
          COALESCE(SUM(total), 0) as total,
          COUNT(*) as transaction_count
        FROM revenue_transactions
        WHERE ${YEAR_OF_ROW} = date_trunc('year', ${NOW_LOCAL})
      `),

      // Yesterday, for comparison
      runGet<any>(`
        SELECT
          COALESCE(SUM(total), 0) as total
        FROM revenue_transactions
        WHERE ${DATE_OF_ROW} = ${NOW_LOCAL}::date - INTERVAL '1 day'
      `),

      // Last month, for comparison
      runGet<any>(`
        SELECT
          COALESCE(SUM(total), 0) as total
        FROM revenue_transactions
        WHERE ${MONTH_OF_ROW} = date_trunc('month', ${NOW_LOCAL} - INTERVAL '1 month')
      `),

      // Payment method breakdown
      runQuery<any>(`
        SELECT
          payment_method,
          COALESCE(SUM(total), 0) as total,
          COUNT(*) as count
        FROM revenue_transactions
        GROUP BY payment_method
        ORDER BY total DESC
      `),

      // Recent transactions (last 10)
      runQuery<any>(`
        SELECT
          id,
          transaction_type,
          reference_number,
          customer_name,
          total,
          payment_method,
          transaction_date
        FROM revenue_transactions
        ORDER BY transaction_date DESC
        LIMIT 10
      `),
    ])

    // Calculate growth percentages
    const todayGrowth = yesterdayRevenue.total > 0
      ? ((todayRevenue.total - yesterdayRevenue.total) / yesterdayRevenue.total) * 100
      : 0

    const monthGrowth = lastMonthRevenue.total > 0
      ? ((monthRevenue.total - lastMonthRevenue.total) / lastMonthRevenue.total) * 100
      : 0

    // Get average transaction value
    const avgTransactionValue = totalRevenue.transaction_count > 0
      ? totalRevenue.total / totalRevenue.transaction_count
      : 0

    return NextResponse.json({
      success: true,
      data: {
        total: {
          revenue: totalRevenue.total,
          subtotal: totalRevenue.subtotal,
          tax: totalRevenue.tax,
          discount: totalRevenue.discount,
          transactions: totalRevenue.transaction_count,
          averageValue: avgTransactionValue,
        },
        today: {
          revenue: todayRevenue.total,
          transactions: todayRevenue.transaction_count,
          growth: todayGrowth,
        },
        month: {
          revenue: monthRevenue.total,
          transactions: monthRevenue.transaction_count,
          growth: monthGrowth,
        },
        year: {
          revenue: yearRevenue.total,
          transactions: yearRevenue.transaction_count,
        },
        bySource: revenueBySource.reduce((acc, item) => {
          acc[item.transaction_type] = {
            total: item.total,
            count: item.transaction_count,
          }
          return acc
        }, {} as any),
        paymentMethods,
        recentTransactions,
      },
    })
  } catch (error) {
    console.error('Error fetching revenue overview:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch revenue overview',
      },
      { status: 500 }
    )
  }
}
