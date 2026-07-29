import type { Database } from 'better-sqlite3'

/**
 * Columns the payment path needs on `orders`.
 *
 * These were never in schema.ts, and the migration that added them was never
 * called from anywhere -- nothing imported it. The payment route wrote
 * `stripe_product_id` and friends regardless, so the first genuine attempt to
 * pay would have failed on "no such column". The flow had not worked end to
 * end at any point.
 *
 * They are in schema.ts now for new databases; this handles the ones that
 * already exist. It takes the open connection rather than calling getDb(),
 * because it runs during initialisation, before getDb() has finished
 * returning.
 */
const COLUMNS: Array<{ name: string; type: string }> = [
  { name: 'stripe_session_id', type: 'TEXT' },
  { name: 'stripe_session_expires_at', type: 'INTEGER' },
  { name: 'stripe_payment_link_url', type: 'TEXT' },
  { name: 'stripe_payment_intent_id', type: 'TEXT' },
  { name: 'paid_at', type: 'DATETIME' },
]

export function addStripeColumns(db: Database): boolean {
  try {
    const existing = new Set(
      (db.prepare('PRAGMA table_info(orders)').all() as Array<{ name: string }>).map(
        column => column.name
      )
    )

    for (const column of COLUMNS) {
      if (existing.has(column.name)) continue
      db.prepare(`ALTER TABLE orders ADD COLUMN ${column.name} ${column.type}`).run()
    }

    return true
  } catch (error) {
    console.error('Failed to add payment columns to orders:', error)
    return false
  }
}
