import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { runUpdate } from '@/lib/db'
import { constructWebhookEvent } from '@/lib/stripe'
import { markOrderFailed, markOrderPaid } from '@/lib/orders'

/**
 * Stripe webhook.
 *
 * The previous version read `request.json()` and believed whatever it found.
 * Any request at all could claim `checkout.session.completed` for an order id
 * and have that order marked paid -- free furniture to anyone who could type
 * a curl command at a URL that is, by design, publicly reachable.
 *
 * Every event is now verified against the signing secret before anything is
 * read from it, and the raw bytes are used to do it: the signature covers
 * exactly what Stripe sent, and a JSON round trip does not reliably reproduce
 * those bytes.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    // Raw text, not .json(). The signature is over these exact bytes.
    const rawBody = await request.text()
    event = constructWebhookEvent(rawBody, signature)
  } catch (error) {
    // Anything that fails verification is refused outright and never reaches
    // the database. 400 rather than 500, so Stripe stops redelivering it.
    console.error('Rejected an unverified webhook:', error)
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = session.metadata?.order_id
        if (!orderId || session.payment_status !== 'paid') break

        await markOrderPaid(orderId, {
          amountFromStripe: session.amount_total,
          sessionId: session.id,
          paymentIntentId:
            typeof session.payment_intent === 'string' ? session.payment_intent : null,
        })
        break
      }

      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent
        const orderId = intent.metadata?.order_id
        if (orderId) {
          await markOrderPaid(orderId, {
            amountFromStripe: intent.amount_received,
            paymentIntentId: intent.id,
          })
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent
        const orderId = intent.metadata?.order_id
        if (orderId) await markOrderFailed(orderId)
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = session.metadata?.order_id

        // Clear the stale URL so /order/cancel opens a fresh checkout rather
        // than sending the customer to a session Stripe has already closed.
        if (orderId) {
          await runUpdate(
            `UPDATE orders
             SET stripe_payment_link_url = NULL,
                 stripe_session_expires_at = NULL,
                 updated_at = NOW()
             WHERE id = ? AND payment_status != 'paid'`,
            [Number(orderId)]
          )
        }
        break
      }

      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    // 500 so Stripe retries: the event was genuine, we simply failed to
    // record it, and dropping it would lose a real payment.
    console.error(`Failed to handle ${event.type}:`, error)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }
}
