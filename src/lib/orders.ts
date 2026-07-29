import { getDb } from '@/lib/db'
import { fromStripeAmount } from '@/lib/currency'

/**
 * Marks an order paid. Once, and only for the right amount.
 *
 * Three separate routes used to do this, each with its own SQL and its own
 * idea of what to check. One of them -- the webhook -- checked nothing at
 * all. Having a single implementation means the amount verification below
 * cannot be true of one path and absent from another.
 *
 * Safe to call repeatedly. Stripe redelivers webhooks on any non-2xx and can
 * report the same payment as both a completed session and a succeeded payment
 * intent, so this will be called more than once for a single payment. The
 * WHERE clause is what makes that harmless: a repeat matches no rows, so the
 * revenue trigger fires exactly once.
 */
export const markOrderPaid = (
  orderId: string | number,
  options: {
    /** Minor units, as Stripe reports them. Checked against the order total. */
    amountFromStripe?: number | null
    sessionId?: string | null
    paymentIntentId?: string | null
  } = {}
): { updated: boolean; reason?: string } => {
  const db = getDb()

  const order = db.prepare('SELECT id, total, payment_status FROM orders WHERE id = ?').get(orderId) as
    | { id: number; total: number; payment_status: string }
    | undefined

  if (!order) return { updated: false, reason: 'no such order' }
  if (order.payment_status === 'paid') return { updated: false, reason: 'already paid' }

  /**
   * If Stripe tells us what it captured, it has to match. A mismatch means
   * the order was altered after the checkout was raised, or the wrong session
   * is being applied to it. Either way, leaving it pending for a person to
   * look at beats recording a payment that did not happen for that amount.
   */
  if (typeof options.amountFromStripe === 'number') {
    const paid = fromStripeAmount(options.amountFromStripe)
    if (Math.abs(paid - order.total) > 0.01) {
      console.error(
        `Order ${orderId}: Stripe captured ${paid} against a total of ${order.total}. Left unpaid.`
      )
      return { updated: false, reason: 'amount mismatch' }
    }
  }

  const result = db
    .prepare(
      `UPDATE orders
       SET payment_status = 'paid',
           status = CASE WHEN status = 'pending' THEN 'processing' ELSE status END,
           payment_method = 'stripe',
           stripe_session_id = COALESCE(?, stripe_session_id),
           stripe_payment_intent_id = COALESCE(?, stripe_payment_intent_id),
           paid_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND payment_status != 'paid'`
    )
    .run(options.sessionId ?? null, options.paymentIntentId ?? null, orderId)

  return { updated: result.changes > 0 }
}

/** Only a payment still waiting can fail; a late failure must not undo a success. */
export const markOrderFailed = (orderId: string | number): void => {
  getDb()
    .prepare(
      `UPDATE orders
       SET payment_status = 'failed', updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND payment_status = 'pending'`
    )
    .run(orderId)
}
