import { NextRequest, NextResponse } from 'next/server'
import { runGet } from '@/lib/db'
import { apiResponse, apiError } from '@/lib/utils'
import { getCheckoutSession, isStripeConfigured } from '@/lib/stripe'
import { markOrderPaid } from '@/lib/orders'

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
 * Order status for the success and cancel pages, reconciled against Stripe.
 *
 * The webhook is the authority, but it is not always there: it has to be
 * configured per deployment and it does not reach a developer's laptop at
 * all, so an order could sit at "pending" indefinitely while the customer
 * looked at a confirmation page. If the order is still unpaid and has a
 * session, this asks Stripe directly and reconciles.
 *
 * It cannot be used to fake a payment. The answer comes from Stripe, against
 * a session id stored on the order rather than one supplied by the caller,
 * and markOrderPaid still checks the amount before it writes anything.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = Number(searchParams.get('orderId'))

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json(apiError('An order id is required'), { status: 400 })
    }

    let order = (await runGet('SELECT * FROM orders WHERE id = ?', [orderId])) as any

    if (!order) {
      return NextResponse.json(apiError('We could not find that order'), { status: 404 })
    }

    if (order.payment_status !== 'paid' && order.stripe_session_id && isStripeConfigured()) {
      try {
        const session = await getCheckoutSession(order.stripe_session_id)
        if (session.payment_status === 'paid') {
          await markOrderPaid(orderId, {
            amountFromStripe: session.amount_total,
            sessionId: session.id,
            paymentIntentId:
              typeof session.payment_intent === 'string' ? session.payment_intent : null,
          })
          order = (await runGet('SELECT * FROM orders WHERE id = ?', [orderId])) as any
        }
      } catch (error) {
        // Reconciliation is a convenience. If Stripe is unreachable the page
        // should still render the order we have rather than fail outright.
        console.error(`Could not reconcile order ${orderId} with Stripe:`, error)
      }
    }

    const isPaid = order.payment_status === 'paid' || order.payment_status === 'completed'

    return NextResponse.json(
      apiResponse({
        orderId: order.id,
        orderNumber: order.order_number,
        status: order.status,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        total: order.total,
        isPaid,
        // Nothing to resume once it is paid.
        paymentUrl: isPaid ? null : order.stripe_payment_link_url,
      })
    )
  } catch (error) {
    console.error('Error checking payment:', error)
    return NextResponse.json(apiError('We could not check that order'), { status: 500 })
  }
}
