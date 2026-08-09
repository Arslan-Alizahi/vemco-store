import { describe, expect, it } from 'vitest'
import { bookingMessage, bookingWhatsappLink } from './whatsapp'
import { toInternationalPhone } from './phone'
import type { BookingDetail } from './bookings'

/**
 * The bill a customer keeps on their phone for three weeks.
 *
 * It is the only copy most of them will still have on collection day, so the
 * four figures it has to carry -- total, paid, outstanding, and the date --
 * are what these check.
 */
/**
 * Intl separates a currency symbol from its number with a non-breaking
 * space, which is right on a bill and invisible to a reader. Asserting on the
 * exact character would make these tests fail over something nobody can see,
 * so both sides are compared with ordinary spaces.
 */
const plain = (text: string) => text.replace(/ /g, ' ')

const booking = (overrides: Partial<BookingDetail> = {}): BookingDetail => ({
  id: 1,
  booking_number: 'BKG-TEST-0001',
  customer_id: 1,
  customer_name: 'Bilal Ahmed',
  customer_phone: '03001234567',
  subtotal: 200_000,
  tax: 36_000,
  discount: 0,
  total: 236_000,
  delivery_date: '2026-09-01',
  status: 'booked',
  delivered_at: null,
  cancelled_at: null,
  notes: null,
  created_at: '2026-08-09T10:00:00.000Z',
  paid: 50_000,
  balance: 186_000,
  items: [
    {
      product_id: 1,
      product_name: 'Emerald Velvet Three-Seater',
      product_sku: 'VMC-SOF-101',
      quantity: 1,
      unit_price: 200_000,
      subtotal: 200_000,
    },
  ],
  payments: [
    { id: 1, amount: 50_000, payment_method: 'cash', notes: 'Advance', paid_at: '2026-08-09T10:00:00.000Z' },
  ],
  ...overrides,
})

describe('the phone number WhatsApp needs', () => {
  it('turns a local number into its international form', () => {
    expect(toInternationalPhone('03001234567')).toBe('923001234567')
  })

  it('accepts however the cashier typed it', () => {
    for (const written of ['0300 1234567', '+92 300 1234567', '0092-300-1234567', '3001234567']) {
      expect(toInternationalPhone(written)).toBe('923001234567')
    }
  })

  /**
   * Half a phone number opens a chat with a stranger, which is worse than no
   * button at all -- so the caller gets nothing and hides the button.
   */
  it.each(['', '0300', '123', 'not a phone'])('refuses %j rather than guessing', value => {
    expect(toInternationalPhone(value)).toBeNull()
  })
})

describe('what the message says', () => {
  it('states the total, what was paid, and what is left', () => {
    const text = plain(bookingMessage(booking()))

    expect(text).toContain('Total: Rs 236,000')
    expect(text).toContain('Paid: Rs 50,000')
    expect(text).toContain('Balance due: Rs 186,000')
  })

  it('gives the delivery date in words a customer can act on', () => {
    expect(plain(bookingMessage(booking()))).toContain('Delivery on 1 September 2026')
  })

  it('says paid in full rather than showing a balance of nothing', () => {
    const text = plain(bookingMessage(booking({ paid: 236_000, balance: 0 })))

    expect(text).toContain('Balance: nil — paid in full')
    expect(text).not.toContain('Balance due')
  })

  it('reports a delivered booking as delivered', () => {
    const text = plain(
      bookingMessage(
        booking({ status: 'delivered', delivered_at: '2026-09-03T09:00:00.000Z', paid: 236_000, balance: 0 })
      )
    )

    expect(text).toContain('Delivered on 3 September 2026')
  })

  it('lists every piece, with its quantity', () => {
    expect(plain(bookingMessage(booking()))).toContain('1 × Emerald Velvet Three-Seater')
  })

  it('carries the booking number, which is how the shop finds it again', () => {
    expect(plain(bookingMessage(booking()))).toContain('BKG-TEST-0001')
  })
})

describe('the link', () => {
  it('points at wa.me with the number and the message', () => {
    const link = bookingWhatsappLink(booking())

    expect(link).toMatch(/^https:\/\/wa\.me\/923001234567\?text=/)
    expect(plain(decodeURIComponent(link!.split('?text=')[1]))).toContain('Balance due: Rs 186,000')
  })

  it('escapes the message rather than breaking the URL', () => {
    const link = bookingWhatsappLink(booking({ customer_name: 'A & B Traders' }))

    expect(link).not.toContain(' ')
    expect(link).toContain('%26')
  })

  it('is null when there is no number worth opening a chat with', () => {
    expect(bookingWhatsappLink(booking({ customer_phone: '0300' }))).toBeNull()
  })
})
