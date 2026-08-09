import { runGet, runQuery, runTransaction, runUpdate } from '@/lib/db'
import { upsertCustomer } from '@/lib/customers'
import { generateBookingNumber } from '@/lib/utils'

/**
 * Furniture ordered today and collected later.
 *
 * A counter receipt is a sale that finishes at the till. A booking is the
 * other kind a furniture shop makes: the customer picks a piece, leaves an
 * advance, and is given a date. Everything here follows from two rules.
 *
 * **The balance is never stored.** It is the total minus the payments taken
 * so far, worked out at the moment it is asked for. A stored balance is a
 * second copy of the same fact and the two disagree the first time a payment
 * is corrected.
 *
 * **Revenue follows the money, not the promise.** Each payment files its own
 * revenue row, so a Rs 200,000 booking with Rs 50,000 down is Rs 50,000 of
 * takings today. Recording the whole total on the day of booking would put
 * money in the books that is still in the customer's pocket.
 */

export interface BookingItemInput {
  product_id: number
  product_name: string
  product_sku?: string | null
  quantity: number
  unit_price: number
}

export interface BookingLine {
  product_id: number | null
  product_name: string
  product_sku: string | null
  quantity: number
  unit_price: number
  subtotal: number
}

export interface BookingPayment {
  id: number
  amount: number
  payment_method: string
  notes: string | null
  paid_at: string
}

export interface Booking {
  id: number
  booking_number: string
  customer_id: number
  customer_name: string
  customer_phone: string
  subtotal: number
  tax: number
  discount: number
  total: number
  delivery_date: string
  status: 'booked' | 'delivered' | 'cancelled'
  delivered_at: string | null
  cancelled_at: string | null
  notes: string | null
  created_at: string
  /** Summed from booking_payments, never stored. */
  paid: number
  balance: number
}

export interface BookingDetail extends Booking {
  items: BookingLine[]
  payments: BookingPayment[]
}

/**
 * Rounded to the paisa before comparing.
 *
 * Totals are NUMERIC(10,2) and payments are entered by hand, so a balance can
 * land on 0.004 and refuse to count as settled. Money comparisons need a
 * tolerance or they eventually strand a booking nobody can close.
 */
const settled = (balance: number) => Math.abs(balance) < 0.01

/** The figures every list and detail view needs, in one place. */
const WITH_TOTALS = `
  SELECT
    b.*,
    COALESCE(p.paid, 0) AS paid,
    b.total - COALESCE(p.paid, 0) AS balance
  FROM bookings b
  LEFT JOIN (
    SELECT booking_id, SUM(amount) AS paid FROM booking_payments GROUP BY booking_id
  ) p ON p.booking_id = b.id
`

export const createBooking = async (input: {
  customer_name: string
  customer_phone: string
  customer_email?: string | null
  items: BookingItemInput[]
  tax: number
  discount?: number
  delivery_date: string
  advance: number
  payment_method?: string
  notes?: string | null
}): Promise<BookingDetail> => {
  if (!input.items?.length) {
    throw Object.assign(new Error('A booking needs at least one piece'), { status: 400 })
  }
  if (!input.delivery_date) {
    throw Object.assign(new Error('A booking needs a delivery date'), { status: 400 })
  }

  /**
   * The customer record comes first and outside the transaction.
   *
   * A booking is a promise to somebody: without a name and a number there is
   * nobody to hand the furniture to in three weeks, and nobody to telephone
   * if the date slips. This is why customer_id is NOT NULL on the table.
   */
  const customer = await upsertCustomer({
    name: input.customer_name,
    phone: input.customer_phone,
    email: input.customer_email ?? null,
  })

  if (!customer) {
    throw Object.assign(new Error('A booking needs the customer’s name and phone number'), {
      status: 400,
    })
  }

  const subtotal = input.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
  const discount = input.discount ?? 0
  const total = subtotal + input.tax - discount

  if (input.advance < 0) {
    throw Object.assign(new Error('An advance cannot be negative'), { status: 400 })
  }
  if (input.advance > total + 0.01) {
    throw Object.assign(new Error('The advance is more than the total'), { status: 400 })
  }

  const bookingId = await runTransaction(async tx => {
    const booking = await runGet<{ id: number }>(
      `INSERT INTO bookings (
         booking_number, customer_id, customer_name, customer_phone,
         subtotal, tax, discount, total, delivery_date, notes
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
      [
        generateBookingNumber(),
        customer.id,
        customer.name,
        customer.phone,
        subtotal,
        input.tax,
        discount,
        total,
        input.delivery_date,
        input.notes ?? null,
      ],
      tx
    )

    const id = booking!.id

    for (const item of input.items) {
      await runGet(
        `INSERT INTO booking_items (
           booking_id, product_id, product_name, product_sku, quantity, unit_price, subtotal
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          item.product_id,
          item.product_name,
          item.product_sku ?? null,
          item.quantity,
          item.unit_price,
          item.unit_price * item.quantity,
        ],
        tx
      )

      /**
       * The piece is committed the moment it is booked.
       *
       * It belongs to this customer for the next three weeks, so the shop
       * must not be able to sell it to somebody else in the meantime. The
       * conditional WHERE is what makes that safe against two tills.
       */
      const changed = await runUpdate(
        'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?',
        [item.quantity, item.product_id, item.quantity],
        tx
      )

      if (changed === 0) {
        throw Object.assign(
          new Error(`There is not enough ${item.product_name} left to book`),
          { status: 409 }
        )
      }
    }

    // An advance of nothing is allowed -- some shops book on a promise -- but
    // it should not file a revenue row for zero.
    if (input.advance > 0) {
      await runGet(
        `INSERT INTO booking_payments (booking_id, amount, payment_method, notes)
         VALUES (?, ?, ?, 'Advance')`,
        [id, input.advance, input.payment_method ?? 'cash'],
        tx
      )
    }

    return id
  })

  return (await getBooking(bookingId))!
}

export const listBookings = async (filter?: {
  status?: 'booked' | 'delivered' | 'cancelled'
  search?: string
}): Promise<Booking[]> => {
  const where: string[] = []
  const params: unknown[] = []

  if (filter?.status) {
    where.push('b.status = ?')
    params.push(filter.status)
  }

  if (filter?.search?.trim()) {
    // ILIKE, so a cashier searching "bilal" finds "Bilal Ahmed".
    where.push('(b.customer_name ILIKE ? OR b.customer_phone LIKE ? OR b.booking_number ILIKE ?)')
    const term = `%${filter.search.trim()}%`
    params.push(term, term, term)
  }

  return runQuery<Booking>(
    `${WITH_TOTALS}
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY
       CASE b.status WHEN 'booked' THEN 0 WHEN 'delivered' THEN 1 ELSE 2 END,
       b.delivery_date ASC`,
    params
  )
}

export const getBooking = async (id: number): Promise<BookingDetail | null> => {
  const booking = await runGet<Booking>(`${WITH_TOTALS} WHERE b.id = ?`, [id])
  if (!booking) return null

  const [items, payments] = await Promise.all([
    runQuery<BookingLine>(
      `SELECT product_id, product_name, product_sku, quantity, unit_price, subtotal
       FROM booking_items WHERE booking_id = ? ORDER BY id`,
      [id]
    ),
    runQuery<BookingPayment>(
      `SELECT id, amount, payment_method, notes, paid_at
       FROM booking_payments WHERE booking_id = ? ORDER BY paid_at, id`,
      [id]
    ),
  ])

  return { ...booking, items, payments }
}

/** A further instalment, or the balance on collection day. */
export const recordBookingPayment = async (
  id: number,
  amount: number,
  method = 'cash',
  notes?: string | null
): Promise<BookingDetail> => {
  const booking = await getBooking(id)

  if (!booking) throw Object.assign(new Error('No such booking'), { status: 404 })
  if (booking.status === 'cancelled') {
    throw Object.assign(new Error('That booking was cancelled'), { status: 409 })
  }
  if (!(amount > 0)) {
    throw Object.assign(new Error('A payment has to be more than nothing'), { status: 400 })
  }

  /**
   * Refuse to take more than is owed.
   *
   * Overpaying is how a shop ends up owing a customer money it has no record
   * of owing. The cashier is told the exact figure instead.
   */
  if (amount > booking.balance + 0.01) {
    throw Object.assign(
      new Error(`Only Rs ${Math.round(booking.balance).toLocaleString()} is outstanding`),
      { status: 400 }
    )
  }

  await runGet(
    `INSERT INTO booking_payments (booking_id, amount, payment_method, notes)
     VALUES (?, ?, ?, ?)`,
    [id, amount, method, notes ?? null]
  )

  return (await getBooking(id))!
}

/**
 * Handed over.
 *
 * Refused while money is outstanding: the furniture leaving the shop is the
 * shop's last piece of leverage, and a booking marked delivered with a
 * balance on it is a debt with nothing behind it. Take the balance first --
 * that is one more payment, which is what collection day is for.
 */
export const markBookingDelivered = async (id: number): Promise<BookingDetail> => {
  const booking = await getBooking(id)

  if (!booking) throw Object.assign(new Error('No such booking'), { status: 404 })
  if (booking.status === 'cancelled') {
    throw Object.assign(new Error('That booking was cancelled'), { status: 409 })
  }
  if (booking.status === 'delivered') return booking

  if (!settled(booking.balance)) {
    throw Object.assign(
      new Error(
        `Rs ${Math.round(booking.balance).toLocaleString()} is still outstanding. Record the final payment first.`
      ),
      { status: 409 }
    )
  }

  await runUpdate(
    `UPDATE bookings SET status = 'delivered', delivered_at = NOW() WHERE id = ? AND status = 'booked'`,
    [id]
  )

  return (await getBooking(id))!
}

/**
 * Cancelled, and the stock released.
 *
 * The payments are deliberately left where they are. Money that came in is a
 * fact, and quietly deleting the revenue rows would make a month's takings
 * disagree with the till for a reason nobody could find later. Whether an
 * advance is refundable is the shop's decision, made at the counter.
 */
export const cancelBooking = async (id: number): Promise<BookingDetail> => {
  const booking = await getBooking(id)

  if (!booking) throw Object.assign(new Error('No such booking'), { status: 404 })
  if (booking.status === 'delivered') {
    throw Object.assign(new Error('That booking has already been delivered'), { status: 409 })
  }
  if (booking.status === 'cancelled') return booking

  await runTransaction(async tx => {
    const changed = await runUpdate(
      `UPDATE bookings SET status = 'cancelled', cancelled_at = NOW()
       WHERE id = ? AND status = 'booked'`,
      [id],
      tx
    )

    // Only give the stock back if this call is the one that cancelled it, so
    // two clicks cannot return the same pieces twice.
    if (changed > 0) {
      await runUpdate(
        `UPDATE products p
         SET stock_quantity = p.stock_quantity + i.quantity
         FROM booking_items i
         WHERE i.booking_id = ? AND p.id = i.product_id`,
        [id],
        tx
      )
    }
  })

  return (await getBooking(id))!
}

/** Bookings whose date has passed and which are still waiting. */
export const overdueBookings = async (): Promise<Booking[]> =>
  runQuery<Booking>(
    `${WITH_TOTALS} WHERE b.status = 'booked' AND b.delivery_date < CURRENT_DATE
     ORDER BY b.delivery_date ASC`
  )
