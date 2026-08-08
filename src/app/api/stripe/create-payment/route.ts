import { NextRequest, NextResponse } from 'next/server'
import { runGet, runQuery, runUpdate } from '@/lib/db'
import { apiResponse, apiError } from '@/lib/utils'
import { CURRENCY } from '@/lib/currency'
import { createCheckoutSession, isStripeConfigured } from '@/lib/stripe'

/**
 * Never evaluated at build time.
 *
 * Next collects page data by importing every route and deciding whether the
 * handler is static, which means running it. Any route that opens the
 * database therefore ran during `next build` -- quietly creating and seeding
 * a file, and failing outright on a build that has no database to open.
 */
export const dynamic = 'force-dynamic'

/**
 * Starts payment for an order that already exists.
 *
 * The order is the source of truth. Nothing about the amount comes from this
 * request -- it carries an order id and nothing else -- so the figure the
 * customer is charged is the figure the order route computed from the
 * catalogue.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const orderId = Number(body?.orderId)

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json(apiError('An order id is required'), { status: 400 })
    }

    if (!isStripeConfigured()) {
      return NextResponse.json(
        apiError('Payments are not configured on this deployment'),
        { status: 503 }
      )
    }

    const order = (await runGet('SELECT * FROM orders WHERE id = ?', [orderId])) as any
    if (!order) {
      return NextResponse.json(apiError('We could not find that order'), { status: 404 })
    }

    if (order.payment_status === 'paid' || order.payment_status === 'completed') {
      return NextResponse.json(apiError('That order is already paid'), { status: 409 })
    }

    /**
     * Reuse an unexpired session rather than opening a second one.
     *
     * Someone who abandons a payment and comes back through /order/cancel
     * should land on the same checkout, not create a parallel one that could
     * also be completed. Stripe sessions expire after 24 hours; past that a
     * fresh one is correct.
     */
    if (order.stripe_session_id && order.stripe_session_expires_at) {
      const expiresAt = Number(order.stripe_session_expires_at)
      if (Number.isFinite(expiresAt) && expiresAt * 1000 > Date.now() && order.stripe_payment_link_url) {
        return NextResponse.json(
          apiResponse({
            orderId: order.id,
            orderNumber: order.order_number,
            amount: order.total,
            currency: CURRENCY,
            paymentUrl: order.stripe_payment_link_url,
          })
        )
      }
    }

    const items = (await runQuery(
      'SELECT product_name, product_sku, quantity, unit_price FROM order_items WHERE order_id = ?',
      [orderId]
    )) as Array<{
      product_name: string
      product_sku: string | null
      quantity: number
      unit_price: number
    }>

    if (items.length === 0) {
      return NextResponse.json(apiError('That order has nothing in it'), { status: 409 })
    }

    const session = await createCheckoutSession({
      orderId: order.id,
      orderNumber: order.order_number,
      customerEmail: order.customer_email,
      lines: items.map(item => ({
        name: item.product_name,
        description: item.product_sku ?? undefined,
        unitAmount: item.unit_price,
        quantity: item.quantity,
      })),
      shipping: order.shipping_cost,
      tax: order.tax,
    })

    if (!session.url) {
      return NextResponse.json(apiError('Stripe did not return a checkout URL'), { status: 502 })
    }

    await runUpdate(
      `UPDATE orders
       SET stripe_session_id = ?,
           stripe_payment_link_url = ?,
           stripe_session_expires_at = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [session.id, session.url, session.expires_at ?? null, orderId]
    )

    return NextResponse.json(
      apiResponse({
        orderId: order.id,
        orderNumber: order.order_number,
        amount: order.total,
        currency: CURRENCY,
        paymentUrl: session.url,
      })
    )
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(apiError('We could not start the payment'), { status: 500 })
  }
}
