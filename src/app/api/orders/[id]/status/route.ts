import { NextRequest, NextResponse } from 'next/server'
import { runGet } from '@/lib/db'
import { apiResponse, apiError } from '@/lib/utils'

/**
 * Never evaluated at build time.
 *
 * Next collects page data by importing every route and deciding whether the
 * handler is static, which means running it. Any route that opens the
 * database therefore ran during `next build` -- quietly creating and seeding
 * a file, and failing outright on a build that has no database to open.
 */
export const dynamic = 'force-dynamic'

// PUT /api/orders/[id]/status - Update order payment status (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { paymentStatus, paymentMethod } = body
    const orderId = params.id

    if (!orderId) {
      return NextResponse.json(
        apiError('Order ID is required'),
        { status: 400 }
      )
    }

    if (!paymentStatus) {
      return NextResponse.json(
        apiError('Payment status is required'),
        { status: 400 }
      )
    }

    // Validate payment status
    const validStatuses = ['pending', 'paid', 'completed', 'failed', 'refunded']
    if (!validStatuses.includes(paymentStatus)) {
      return NextResponse.json(
        apiError('Invalid payment status'),
        { status: 400 }
      )
    }

    /**
     * Stamp `paid_at` when the status becomes paid, and only the first time.
     *
     * Stripe's path (`markOrderPaid`) sets it; the admin's "Mark as paid"
     * button did not, so an order settled in cash at the counter was recorded
     * as paid with no record of when. COALESCE keeps the original moment if
     * the status is set again later.
     */
    const settled = paymentStatus === 'paid' || paymentStatus === 'completed'
    const paidAt = settled ? ', paid_at = COALESCE(paid_at, NOW())' : ''

    // The update both changes the row and reports whether there was one.
    const updateSql = paymentMethod
      ? `UPDATE orders SET payment_status = ?, payment_method = ?, updated_at = NOW()${paidAt} WHERE id = ? RETURNING *`
      : `UPDATE orders SET payment_status = ?, updated_at = NOW()${paidAt} WHERE id = ? RETURNING *`

    const params_array = paymentMethod
      ? [paymentStatus, paymentMethod, Number(orderId)]
      : [paymentStatus, Number(orderId)]

    const updatedOrder = (await runGet(updateSql, params_array)) as
      | Record<string, unknown>
      | undefined

    if (!updatedOrder) {
      return NextResponse.json(
        apiError('Order not found'),
        { status: 404 }
      )
    }

    return NextResponse.json(
      apiResponse({
        ...updatedOrder,
        message: 'Order payment status updated successfully'
      })
    )
  } catch (error: any) {
    console.error('Error updating order status:', error)
    return NextResponse.json(
      apiError(error.message || 'Failed to update order status'),
      { status: 500 }
    )
  }
}

// GET /api/orders/[id]/status - Get order payment status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id

    if (!orderId) {
      return NextResponse.json(
        apiError('Order ID is required'),
        { status: 400 }
      )
    }

    // Fetch order
    const order = (await runGet('SELECT * FROM orders WHERE id = ?', [Number(orderId)])) as any

    if (!order) {
      return NextResponse.json(
        apiError('Order not found'),
        { status: 404 }
      )
    }

    return NextResponse.json(
      apiResponse({
        orderId: order.id,
        orderNumber: order.order_number,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        total: order.total
      })
    )
  } catch (error: any) {
    console.error('Error fetching order status:', error)
    return NextResponse.json(
      apiError(error.message || 'Failed to fetch order status'),
      { status: 500 }
    )
  }
}

