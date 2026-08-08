import { NextRequest, NextResponse } from 'next/server'
import { runGet, runQuery, runTransaction, runUpdate } from '@/lib/db'
import { apiResponse, apiError, generateReceiptNumber, calculateTax, calculateTotal } from '@/lib/utils'
import { upsertCustomer } from '@/lib/customers'

/**
 * Never evaluated at build time.
 *
 * Next collects page data by importing every route and deciding whether the
 * handler is static, which means running it. Any route that opens the
 * database therefore ran during `next build` -- quietly creating and seeding
 * a file, and failing outright on a build that has no database to open.
 */
export const dynamic = 'force-dynamic'

// POST /api/billing - Create billing receipt and update stock
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        apiError('Receipt must have at least one item'),
        { status: 400 }
      )
    }

    /**
     * Whoever this was for, remembered.
     *
     * Outside the transaction on purpose: a customer record is worth keeping
     * even if the sale itself then fails on a stock check, and a failed sale
     * should not roll back somebody's contact details. Both fields are
     * optional -- a walk-in who does not want to leave a number still gets a
     * receipt, they simply do not accumulate a history.
     */
    const customer =
      body.customer_name && body.customer_phone
        ? await upsertCustomer({
            name: body.customer_name,
            phone: body.customer_phone,
            // Kept on the customer, not copied onto the receipt. A receipt is
            // printed and left on counters and in bags; a name and phone are
            // there because they identify the sale, and an email address on
            // paper is only a liability.
            email: body.customer_email,
          })
        : null

    return await runTransaction(async tx => {
      // Calculate totals
      let subtotal = 0
      for (const item of body.items) {
        subtotal += item.unit_price * item.quantity
      }

      const tax = body.tax || calculateTax(subtotal)
      const discount = body.discount || 0
      const total = calculateTotal(subtotal, tax, 0, discount)
      const changeAmount = (body.amount_paid || total) - total

      // Create receipt
      const receiptNumber = generateReceiptNumber()
      const receipt = (await runGet(
        `
        INSERT INTO billing_receipts (
          receipt_number, customer_id, customer_name, customer_phone, subtotal,
          tax, discount, total, payment_method, amount_paid, change_amount, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING *
      `,
        [
          receiptNumber,
          customer?.id ?? null,
          // Copied onto the receipt as well as linked. A receipt reprinted in
          // two years should say who it was for even if the customer record
          // has since been edited.
          customer?.name ?? body.customer_name ?? null,
          customer?.phone ?? body.customer_phone ?? null,
          subtotal,
          tax,
          discount,
          total,
          body.payment_method || 'cash',
          body.amount_paid || total,
          changeAmount,
          body.notes || null,
        ],
        tx
      )) as Record<string, unknown>

      const receiptId = receipt.id as number

      for (const item of body.items) {
        // Insert billing item
        await runGet(
          `
        INSERT INTO billing_items (
          receipt_id, product_id, product_name, product_sku,
          quantity, unit_price, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
          [
            receiptId,
            item.product_id,
            item.product_name,
            item.product_sku || null,
            item.quantity,
            item.unit_price,
            item.unit_price * item.quantity,
          ],
          tx
        )

        // Update stock
        const changed = await runUpdate(
          'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?',
          [item.quantity, item.product_id, item.quantity],
          tx
        )

        if (changed === 0) {
          throw new Error(`Insufficient stock for product ${item.product_name}`)
        }
      }

      const items = await runQuery(
        'SELECT * FROM billing_items WHERE receipt_id = ?',
        [receiptId],
        tx
      )

      return NextResponse.json(
        apiResponse({ ...receipt, items }),
        { status: 201 }
      )
    })
  } catch (error: any) {
    console.error('Error creating receipt:', error)
    return NextResponse.json(
      apiError(error.message || 'Failed to create receipt'),
      { status: 500 }
    )
  }
}

// GET /api/billing - Get all receipts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    let sql = 'SELECT * FROM billing_receipts WHERE 1=1'
    const params: any[] = []

    if (searchParams.get('receipt_number')) {
      sql += ' AND receipt_number = ?'
      params.push(searchParams.get('receipt_number'))
    }

    sql += ' ORDER BY created_at DESC LIMIT 100'

    const receipts = await runQuery(sql, params)

    return NextResponse.json(apiResponse(receipts))
  } catch (error) {
    console.error('Error fetching receipts:', error)
    return NextResponse.json(
      apiError('Failed to fetch receipts'),
      { status: 500 }
    )
  }
}