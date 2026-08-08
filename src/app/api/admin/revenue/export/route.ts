import { NextRequest, NextResponse } from 'next/server'
import { runQuery } from '@/lib/db'
import { SHOP_TIMEZONE, localDate } from '@/lib/shop-time'

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
    const type = searchParams.get('type') // 'store', 'billing', or 'all'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

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

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Get all transactions
    const transactions = await runQuery<any>(
      `
        SELECT
          transaction_type as "Transaction Type",
          reference_number as "Reference Number",
          customer_name as "Customer Name",
          customer_email as "Customer Email",
          customer_phone as "Customer Phone",
          subtotal as "Subtotal",
          tax as "Tax",
          discount as "Discount",
          shipping_cost as "Shipping Cost",
          total as "Total",
          payment_method as "Payment Method",
          payment_status as "Payment Status",
          -- SQLite's datetime() does not exist in Postgres, which made every
          -- export answer 500. Formatted in the shop timezone, because this
          -- is the column an accountant reads.
          to_char(transaction_date AT TIME ZONE '${SHOP_TIMEZONE}', 'YYYY-MM-DD HH24:MI') as "Transaction Date",
          notes as "Notes"
        FROM revenue_transactions
        ${whereClause}
        ORDER BY transaction_date DESC
      `,
      params
    )

    // Convert to CSV
    if (transactions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No transactions found for the specified criteria',
        },
        { status: 404 }
      )
    }

    // Get column headers
    const headers = Object.keys(transactions[0])

    // Create CSV content
    const csvRows = [
      headers.join(','), // Header row
      ...transactions.map(row =>
        headers.map(header => {
          const value = row[header]
          // Escape quotes and wrap in quotes if contains comma or quote
          if (value === null || value === undefined) return ''
          const stringValue = String(value)
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`
          }
          return stringValue
        }).join(',')
      )
    ]

    const csvContent = csvRows.join('\n')

    // Generate filename
    const filename = `revenue-export-${type || 'all'}-${new Date().toISOString().split('T')[0]}.csv`

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting revenue data:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export revenue data',
      },
      { status: 500 }
    )
  }
}
