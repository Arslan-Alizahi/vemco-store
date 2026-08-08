import Stripe from 'stripe'
import { stripeCurrency, toStripeAmount } from './currency'

/**
 * A key has to look like a key, not merely be present.
 *
 * `.env.example` ships `STRIPE_SECRET_KEY=your_api_key_here`, and anyone who
 * copies it without editing gets a value that is not empty. That was enough
 * to count as configured: the route skipped its "payments are not set up"
 * branch, called Stripe with nonsense, and answered 500. The customer had by
 * then already had an order created and stock reserved, and saw only a
 * failure with no reason attached.
 *
 * Stripe secret keys begin `sk_`; restricted keys begin `rk_`. Anything else
 * is a placeholder, a publishable key pasted into the wrong variable, or a
 * typo -- all of which should read as "not configured" rather than as a
 * broken payment provider.
 */
const rawKey = process.env.STRIPE_SECRET_KEY?.trim()
const stripeSecretKey = rawKey && /^(sk|rk)_/.test(rawKey) ? rawKey : undefined

if (!stripeSecretKey) {
  console.warn(
    rawKey
      ? '⚠️  STRIPE_SECRET_KEY does not look like a Stripe secret key (expected sk_… or rk_…). Online payment is switched off.'
      : '⚠️  STRIPE_SECRET_KEY is not set. Online payment is switched off.'
  )
}

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      // Pinned deliberately. Bumping this changes response shapes and default
      // behaviour, which belongs to its own task with its own verification.
      apiVersion: '2024-11-20.acacia' as unknown as Stripe.LatestApiVersion,
      typescript: true,
    })
  : null

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

const requireStripe = (): Stripe => {
  if (!stripe) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in .env.local')
  }
  return stripe
}

export interface CheckoutLine {
  name: string
  description?: string
  unitAmount: number
  quantity: number
}

/**
 * One Checkout Session for an order.
 *
 * This replaces a three-call sequence that created a Stripe Product, then a
 * Price, then a Payment Link, for every single order. That left one permanent
 * Product and Price in the Stripe account per order placed -- catalogue
 * clutter that only ever grows -- and cost three round trips at the moment
 * the customer is waiting to pay.
 *
 * It also fixes the hole that made `/order/cancel` unreachable. Payment Links
 * have no cancel destination; they only support `after_completion`, which
 * fires on success. Somebody who reached Stripe and thought better of it was
 * simply dropped, on the one screen where recovering the sale is still
 * possible. A Session takes both `success_url` and `cancel_url`.
 *
 * Line items are priced inline, so nothing is written to the Stripe account
 * and the amounts come from whatever the caller computed -- which, on the
 * order route, means from the database.
 */
export async function createCheckoutSession(options: {
  orderId: number
  orderNumber: string
  customerEmail?: string | null
  lines: CheckoutLine[]
  shipping?: number
  tax?: number
}) {
  const client = requireStripe()
  const currency = stripeCurrency()

  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = options.lines.map(line => ({
    quantity: line.quantity,
    price_data: {
      currency,
      unit_amount: toStripeAmount(line.unitAmount),
      product_data: {
        name: line.name,
        ...(line.description ? { description: line.description } : {}),
      },
    },
  }))

  // Delivery and tax as their own lines rather than folded into the goods, so
  // the Stripe receipt itemises what the cart itemised.
  if (options.shipping && options.shipping > 0) {
    line_items.push({
      quantity: 1,
      price_data: {
        currency,
        unit_amount: toStripeAmount(options.shipping),
        product_data: { name: 'Delivery' },
      },
    })
  }

  if (options.tax && options.tax > 0) {
    line_items.push({
      quantity: 1,
      price_data: {
        currency,
        unit_amount: toStripeAmount(options.tax),
        product_data: { name: 'Tax' },
      },
    })
  }

  return client.checkout.sessions.create({
    mode: 'payment',
    line_items,
    ...(options.customerEmail ? { customer_email: options.customerEmail } : {}),
    // Read back by the webhook to find the order again. Stripe requires
    // strings here, hence the conversion.
    metadata: {
      order_id: String(options.orderId),
      order_number: options.orderNumber,
    },
    payment_intent_data: {
      metadata: {
        order_id: String(options.orderId),
        order_number: options.orderNumber,
      },
    },
    success_url: `${siteUrl()}/order/success?orderId=${options.orderId}`,
    cancel_url: `${siteUrl()}/order/cancel?orderId=${options.orderId}`,
  })
}

export async function getCheckoutSession(sessionId: string) {
  return requireStripe().checkout.sessions.retrieve(sessionId)
}

export async function getPaymentIntent(paymentIntentId: string) {
  return requireStripe().paymentIntents.retrieve(paymentIntentId)
}

/**
 * Verifies a webhook came from Stripe.
 *
 * Needs the raw request body, not a parsed object: the signature is computed
 * over the exact bytes Stripe sent, and JSON.parse followed by JSON.stringify
 * does not reliably reproduce them.
 */
export function constructWebhookEvent(rawBody: string, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set')
  }
  return requireStripe().webhooks.constructEvent(rawBody, signature, secret)
}

export function isStripeConfigured(): boolean {
  return stripe !== null
}
