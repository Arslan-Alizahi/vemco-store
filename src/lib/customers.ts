import { getDb, runQuery } from '@/lib/db'

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
  /** Where it was bought. A counter sale and a website order read differently. */
  source: 'counter' | 'online'
  reference: string
  date: string
  subtotal: number
  tax: number
  discount: number
  total: number
  payment_method: string | null
  status: string | null
  items: PurchaseLine[]
}

/** Pakistan. Set this per deployment if the shop trades elsewhere. */
const COUNTRY_CODE = process.env.NEXT_PUBLIC_PHONE_COUNTRY_CODE || '92'

/** Digits in a local number after the trunk zero — 300 1234567 is ten. */
const NATIONAL_LENGTH = 10

/**
 * One phone number, one customer, however it was typed.
 *
 * Stripping punctuation is not enough. In Pakistan the leading 0 is a trunk
 * prefix that +92 replaces, so 0300 1234567 and +92 300 1234567 are the same
 * line — and a shop where the cashier types it one way on Monday and the
 * other on Friday would file one person as two, each with half their history.
 * That is the exact failure phone-as-identity exists to prevent.
 *
 * Everything is stored in the local 0-prefixed form, because that is what a
 * customer says out loud and what a cashier reads back.
 */
export const normalisePhone = (phone: string): string => {
  let digits = phone.replace(/\D/g, '')

  // 0092 300 1234567 — the international prefix written out.
  if (digits.startsWith(`00${COUNTRY_CODE}`)) digits = digits.slice(2)

  // 92 300 1234567, from a + that the strip above removed.
  if (digits.startsWith(COUNTRY_CODE) && digits.length === COUNTRY_CODE.length + NATIONAL_LENGTH) {
    digits = digits.slice(COUNTRY_CODE.length)
  }

  // 300 1234567, written without the trunk zero.
  if (digits.length === NATIONAL_LENGTH && !digits.startsWith('0')) digits = `0${digits}`

  return digits
}

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
export const upsertCustomer = (input: {
  name: string
  phone: string
  email?: string | null
  address?: string | null
}): Customer | null => {
  const phone = normalisePhone(input.phone)
  const name = input.name.trim()

  if (!phone || !name) return null

  const db = getDb()

  db.prepare(
    `INSERT INTO customers (name, phone, email, address)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(phone) DO UPDATE SET
       name = excluded.name,
       email = COALESCE(excluded.email, customers.email),
       address = COALESCE(excluded.address, customers.address),
       updated_at = CURRENT_TIMESTAMP`
  ).run(name, phone, input.email?.trim() || null, input.address?.trim() || null)

  return db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone) as Customer
}

export const findCustomerByPhone = (phone: string): Customer | null => {
  const digits = normalisePhone(phone)
  if (!digits) return null

  return (
    (getDb().prepare('SELECT * FROM customers WHERE phone = ?').get(digits) as Customer) ?? null
  )
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
`

/** Every customer with what they are worth. */
export const listCustomers = (search?: string): CustomerSummary[] => {
  const term = search?.trim()
  const digits = term ? normalisePhone(term) : ''

  // Searching "0300" should find a phone number; searching "Bilal" should
  // find a name. Both go through the same box, so both are tried.
  const where = term ? 'WHERE c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?' : ''
  const params = term ? [`%${term}%`, `%${term}%`, `%${digits || term}%`] : []

  return runQuery<CustomerSummary>(
    `SELECT
       c.*,
       COUNT(p.total) AS purchase_count,
       COALESCE(SUM(p.total), 0) AS total_spent,
       MAX(p.date) AS last_purchase_at
     FROM customers c
     LEFT JOIN (${PURCHASES_UNION}) p ON p.customer_id = c.id
     ${where}
     GROUP BY c.id
     ORDER BY last_purchase_at IS NULL, last_purchase_at DESC, c.name ASC`,
    params
  )
}

export const getCustomer = (id: number): CustomerSummary | null => {
  const rows = runQuery<CustomerSummary>(
    `SELECT
       c.*,
       COUNT(p.total) AS purchase_count,
       COALESCE(SUM(p.total), 0) AS total_spent,
       MAX(p.date) AS last_purchase_at
     FROM customers c
     LEFT JOIN (${PURCHASES_UNION}) p ON p.customer_id = c.id
     WHERE c.id = ?
     GROUP BY c.id`,
    [id]
  )

  return rows[0] ?? null
}

/** Everything one customer has bought, newest first, from both channels. */
export const getCustomerPurchases = (id: number): Purchase[] => {
  const db = getDb()

  const receipts = runQuery<{
    id: number
    receipt_number: string
    created_at: string
    subtotal: number
    tax: number
    discount: number
    total: number
    payment_method: string
  }>('SELECT * FROM billing_receipts WHERE customer_id = ? ORDER BY created_at DESC', [id])

  const customer = db.prepare('SELECT phone FROM customers WHERE id = ?').get(id) as
    | { phone: string }
    | undefined

  const orders = customer
    ? runQuery<{
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
      )
    : []

  const receiptItems = db.prepare(
    'SELECT product_name, product_sku, quantity, unit_price, subtotal FROM billing_items WHERE receipt_id = ?'
  )
  const orderItems = db.prepare(
    'SELECT product_name, product_sku, quantity, unit_price, subtotal FROM order_items WHERE order_id = ?'
  )

  const purchases: Purchase[] = [
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
      items: receiptItems.all(receipt.id) as PurchaseLine[],
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
      items: orderItems.all(order.id) as PurchaseLine[],
    })),
  ]

  return purchases.sort((a, b) => b.date.localeCompare(a.date))
}
