import { runGet, runQuery } from '@/lib/db'
import { normalisePhone } from '@/lib/phone'

export interface Customer {
  id: number
  name: string
  phone: string
  email: string | null
  address: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CustomerSummary extends Customer {
  purchase_count: number
  total_spent: number
  last_purchase_at: string | null
}

export interface PurchaseLine {
  product_name: string
  product_sku: string | null
  quantity: number
  unit_price: number
  subtotal: number
}

export interface Purchase {
  /** Where it was bought. A counter sale, a website order and a booking all read differently. */
  source: 'counter' | 'online' | 'booking'
  reference: string
  date: string
  subtotal: number
  tax: number
  discount: number
  total: number
  payment_method: string | null
  status: string | null
  items: PurchaseLine[]
  /**
   * Bookings only. A booking is a purchase that is not finished, so the two
   * figures that make it different from a receipt travel with it: what has
   * been paid so far, and when the furniture is due.
   */
  paid?: number
  balance?: number
  delivery_date?: string | null
}

/**
 * Phone handling lives in `lib/phone.ts`, which imports nothing.
 *
 * It used to be here, and anything that wanted `normalisePhone` in a browser
 * -- the till's WhatsApp link, for one -- pulled this module's database
 * connection into the bundle with it. Re-exported so existing callers are
 * unaffected.
 */
export { normalisePhone, toInternationalPhone } from '@/lib/phone'

/**
 * Finds a customer by phone, creating them if they are new, and keeps the
 * name current.
 *
 * Matching is on the digits alone: a cashier types whatever the customer
 * says, and 0300-1234567, 0300 123 4567 and +923001234567 are one person. The
 * name is updated on each visit because the second spelling is usually the
 * better one -- somebody who gave "Bilal" first and "Bilal Ahmed" later meant
 * the same person and the fuller name is more use later.
 */
export const upsertCustomer = async (input: {
  name: string
  phone: string
  email?: string | null
  address?: string | null
}): Promise<Customer | null> => {
  const phone = normalisePhone(input.phone)
  const name = input.name.trim()

  if (!phone || !name) return null

  // RETURNING, rather than inserting and then reading the row back. One round
  // trip instead of two, and no window in which another till could change the
  // row between the write and the read.
  const customer = await runGet<Customer>(
    `INSERT INTO customers (name, phone, email, address)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(phone) DO UPDATE SET
       name = excluded.name,
       email = COALESCE(excluded.email, customers.email),
       address = COALESCE(excluded.address, customers.address),
       updated_at = NOW()
     RETURNING *`,
    [name, phone, input.email?.trim() || null, input.address?.trim() || null]
  )

  return customer ?? null
}

export const findCustomerByPhone = async (phone: string): Promise<Customer | null> => {
  const digits = normalisePhone(phone)
  if (!digits) return null

  return (await runGet<Customer>('SELECT * FROM customers WHERE phone = ?', [digits])) ?? null
}

/**
 * Both channels, as one set of purchases keyed by customer.
 *
 * Counter receipts carry a customer_id. Website orders do not -- checkout has
 * no account -- so they are matched on the phone number, which both sides now
 * store in the same canonical form, so this can be a plain equality rather
 * than a pile of REPLACE() calls trying to normalise inside SQL.
 * Somebody who bought a sofa online and a lamp at the till is one customer,
 * and a shop that treats them as two cannot answer the only question worth
 * asking about them.
 */
const PURCHASES_UNION = `
  SELECT customer_id, total, created_at AS date
  FROM billing_receipts
  WHERE customer_id IS NOT NULL

  UNION ALL

  SELECT cu.id, o.total, o.created_at
  FROM orders o
  JOIN customers cu ON o.customer_phone = cu.phone
  WHERE o.payment_status = 'paid'

  UNION ALL

  /**
   * Bookings count what has been paid, not what was promised.
   *
   * A receipt and a paid order are money already taken, so their total is
   * what the customer has spent. A booking is half-finished: someone with a
   * Rs 200,000 sofa on order and Rs 50,000 down has spent Rs 50,000 here, and
   * counting the whole total would inflate their lifetime value by money
   * still in their pocket. Cancelled bookings keep whatever was paid against
   * them, because that money did change hands.
   */
  SELECT b.customer_id, COALESCE(SUM(bp.amount), 0), b.created_at
  FROM bookings b
  LEFT JOIN booking_payments bp ON bp.booking_id = b.id
  GROUP BY b.id, b.customer_id, b.created_at
  HAVING COALESCE(SUM(bp.amount), 0) > 0
`

/**
 * The rolled-up figures, shared by the list and the single-customer view.
 *
 * `GROUP BY c.id` with `c.*` in the select list is legal because id is the
 * primary key: Postgres knows every other column of that row is determined by
 * it. Grouping by anything else here would need all of them listed.
 */
const SUMMARY_SELECT = `
  SELECT
    c.*,
    COUNT(p.total) AS purchase_count,
    COALESCE(SUM(p.total), 0) AS total_spent,
    MAX(p.date) AS last_purchase_at
  FROM customers c
  LEFT JOIN (${PURCHASES_UNION}) p ON p.customer_id = c.id
`

/** Every customer with what they are worth. */
export const listCustomers = async (search?: string): Promise<CustomerSummary[]> => {
  const term = search?.trim()
  const digits = term ? normalisePhone(term) : ''

  /**
   * ILIKE, not LIKE.
   *
   * SQLite's LIKE ignores case for ASCII; Postgres's does not. Left as LIKE,
   * a cashier who typed "bilal" would be told there is no such customer while
   * "Bilal Ahmed" sat in the table -- and would then create a duplicate.
   */
  const where = term ? 'WHERE c.name ILIKE ? OR c.email ILIKE ? OR c.phone LIKE ?' : ''
  const params = term ? [`%${term}%`, `%${term}%`, `%${digits || term}%`] : []

  return runQuery<CustomerSummary>(
    `${SUMMARY_SELECT}
     ${where}
     GROUP BY c.id
     ORDER BY last_purchase_at DESC NULLS LAST, c.name ASC`,
    params
  )
}

export const getCustomer = async (id: number): Promise<CustomerSummary | null> =>
  (await runGet<CustomerSummary>(`${SUMMARY_SELECT} WHERE c.id = ? GROUP BY c.id`, [id])) ?? null

/** Groups line items by the receipt or order they belong to. */
const byParent = <T extends { parent_id: number }>(rows: T[]): Map<number, PurchaseLine[]> => {
  const grouped = new Map<number, PurchaseLine[]>()
  for (const { parent_id, ...line } of rows) {
    grouped.set(parent_id, [...(grouped.get(parent_id) ?? []), line as unknown as PurchaseLine])
  }
  return grouped
}

/**
 * Everything one customer has bought, newest first, from both channels.
 *
 * Five queries, whatever the length of the history.
 *
 * Under SQLite the line items were fetched one prepared statement at a time
 * inside a `.map()`, which cost nothing when the database was a file in the
 * same process. Against a database in Mumbai, a customer with forty purchases
 * would have paid forty round trips -- several seconds of a page that used to
 * be instant. The items are collected in one query per channel and matched up
 * here instead.
 */
export const getCustomerPurchases = async (id: number): Promise<Purchase[]> => {
  const customer = await runGet<{ phone: string }>('SELECT phone FROM customers WHERE id = ?', [id])

  const [receipts, receiptLines] = await Promise.all([
    runQuery<{
      id: number
      receipt_number: string
      created_at: string
      subtotal: number
      tax: number
      discount: number
      total: number
      payment_method: string
    }>('SELECT * FROM billing_receipts WHERE customer_id = ? ORDER BY created_at DESC', [id]),

    runQuery<PurchaseLine & { parent_id: number }>(
      `SELECT receipt_id AS parent_id, product_name, product_sku, quantity, unit_price, subtotal
       FROM billing_items
       WHERE receipt_id IN (SELECT id FROM billing_receipts WHERE customer_id = ?)`,
      [id]
    ),
  ])

  const [orders, orderLines] = customer
    ? await Promise.all([
        runQuery<{
          id: number
          order_number: string
          created_at: string
          subtotal: number
          tax: number
          discount: number
          total: number
          status: string
          payment_method: string
        }>(
          `SELECT * FROM orders
           WHERE customer_phone = ? AND payment_status = 'paid'
           ORDER BY created_at DESC`,
          [customer.phone]
        ),

        runQuery<PurchaseLine & { parent_id: number }>(
          `SELECT order_id AS parent_id, product_name, product_sku, quantity, unit_price, subtotal
           FROM order_items
           WHERE order_id IN (
             SELECT id FROM orders WHERE customer_phone = ? AND payment_status = 'paid'
           )`,
          [customer.phone]
        ),
      ])
    : [[], []]

  /**
   * Bookings, with what has been paid against each.
   *
   * They belong in the history even while unfinished: a customer telephoning
   * about "my sofa" is asking about a booking, and a shop that can only show
   * completed sales cannot answer.
   */
  const [bookings, bookingLines] = await Promise.all([
    runQuery<{
      id: number
      booking_number: string
      created_at: string
      subtotal: number
      tax: number
      discount: number
      total: number
      paid: number
      balance: number
      status: string
      delivery_date: string
    }>(
      `SELECT b.*, COALESCE(p.paid, 0) AS paid, b.total - COALESCE(p.paid, 0) AS balance
       FROM bookings b
       LEFT JOIN (
         SELECT booking_id, SUM(amount) AS paid FROM booking_payments GROUP BY booking_id
       ) p ON p.booking_id = b.id
       WHERE b.customer_id = ?
       ORDER BY b.created_at DESC`,
      [id]
    ),

    runQuery<PurchaseLine & { parent_id: number }>(
      `SELECT booking_id AS parent_id, product_name, product_sku, quantity, unit_price, subtotal
       FROM booking_items
       WHERE booking_id IN (SELECT id FROM bookings WHERE customer_id = ?)`,
      [id]
    ),
  ])

  const receiptItems = byParent(receiptLines)
  const orderItems = byParent(orderLines)
  const bookingItems = byParent(bookingLines)

  const purchases: Purchase[] = [
    ...bookings.map(booking => ({
      source: 'booking' as const,
      reference: booking.booking_number,
      date: booking.created_at,
      subtotal: booking.subtotal,
      tax: booking.tax,
      discount: booking.discount,
      total: booking.total,
      payment_method: null,
      status: booking.status,
      items: bookingItems.get(booking.id) ?? [],
      paid: booking.paid,
      balance: booking.balance,
      delivery_date: booking.delivery_date,
    })),
    ...receipts.map(receipt => ({
      source: 'counter' as const,
      reference: receipt.receipt_number,
      date: receipt.created_at,
      subtotal: receipt.subtotal,
      tax: receipt.tax,
      discount: receipt.discount,
      total: receipt.total,
      payment_method: receipt.payment_method,
      status: null,
      items: receiptItems.get(receipt.id) ?? [],
    })),
    ...orders.map(order => ({
      source: 'online' as const,
      reference: order.order_number,
      date: order.created_at,
      subtotal: order.subtotal,
      tax: order.tax,
      discount: order.discount,
      total: order.total,
      payment_method: order.payment_method,
      status: order.status,
      items: orderItems.get(order.id) ?? [],
    })),
  ]

  return purchases.sort((a, b) => b.date.localeCompare(a.date))
}
