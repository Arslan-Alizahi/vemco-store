import { describe, expect, it } from 'vitest'
import { bookingConfirmationMail, orderConfirmationMail } from './templates'
import { BRAND_ADDRESS, BRAND_EMAIL, BRAND_NAME, BRAND_PHONES } from '@/lib/brand'

/**
 * These messages are the only thing a customer keeps once the printed slip
 * is lost, and the numbers on them are the ones they will quote back at the
 * door. Both parts are asserted -- the HTML and the plain text -- because a
 * client that shows only the text part still has to show the right balance.
 */

const ITEMS = [
  { product_name: 'Regent Tufted Wingback Bed', quantity: 1, unit_price: 268000, subtotal: 268000 },
  { product_name: 'Halden Console', quantity: 2, unit_price: 118000, subtotal: 236000 },
]

const booking = (overrides = {}) =>
  bookingConfirmationMail({
    to: 'customer@example.com',
    customerName: 'Bilal Ahmed',
    bookingNumber: 'BKG-TEST-0001',
    items: ITEMS,
    subtotal: 504000,
    tax: 90720,
    discount: 0,
    total: 594720,
    paid: 200000,
    balance: 394720,
    deliveryDate: '2026-09-01',
    ...overrides,
  })

const order = (overrides = {}) =>
  orderConfirmationMail({
    to: 'customer@example.com',
    customerName: 'Sana Riaz',
    orderNumber: 'ORD-TEST-0001',
    items: ITEMS,
    subtotal: 504000,
    tax: 90720,
    shipping: 0,
    total: 594720,
    deliveryAddress: '12 Some Street, Haripur',
    ...overrides,
  })

describe('booking confirmation', () => {
  it('states the advance paid and the balance still owed', () => {
    const mail = booking()
    for (const part of [mail.html, mail.text]) {
      expect(part).toContain('200,000')
      expect(part).toContain('394,720')
    }
  })

  it('puts the balance in the subject, so it is visible without opening', () => {
    expect(booking().subject).toContain('394,720')
  })

  it('names the delivery date', () => {
    const mail = booking()
    expect(mail.html).toMatch(/Sep|September/)
    expect(mail.text).toMatch(/Sep|September/)
  })

  it('lists every piece booked, with quantities', () => {
    const mail = booking()
    for (const item of ITEMS) {
      expect(mail.html).toContain(item.product_name)
      expect(mail.text).toContain(item.product_name)
    }
    expect(mail.text).toContain('x2')
  })

  /**
   * A booking settled in full must not ask for money. This is the state a
   * customer reaches by paying the balance before delivery day, and telling
   * them they still owe Rs 0 is the kind of message that gets a shop phoned.
   */
  it('says paid in full rather than asking for a zero balance', () => {
    const mail = booking({ paid: 594720, balance: 0 })
    expect(mail.html).toContain('Paid in full')
    expect(mail.subject).not.toContain('due on delivery')
    expect(mail.text).toContain('paid in full')
  })

  it('shows a discount only when there is one', () => {
    expect(booking().html).not.toContain('Discount')
    expect(booking({ discount: 5000 }).html).toContain('Discount')
  })

  it('carries the shop address, both phone lines and the email', () => {
    const mail = booking()
    for (const part of [mail.html, mail.text]) {
      expect(part).toContain(BRAND_ADDRESS)
      expect(part).toContain(BRAND_EMAIL)
      for (const phone of BRAND_PHONES) expect(part).toContain(phone)
    }
  })

  it('greets by first name, and still greets without one', () => {
    expect(booking().text).toContain('Hello Bilal,')
    expect(booking({ customerName: null }).text).toContain('Hello,')
  })
})

describe('order confirmation', () => {
  it('names the order and what was in it', () => {
    const mail = order()
    expect(mail.subject).toContain('ORD-TEST-0001')
    expect(mail.html).toContain('Regent Tufted Wingback Bed')
    expect(mail.text).toContain('Regent Tufted Wingback Bed')
  })

  it('says Free rather than Rs 0 when delivery is not charged', () => {
    const mail = order({ shipping: 0 })
    expect(mail.text).toContain('Free')
  })

  it('shows the delivery charge when there is one', () => {
    expect(order({ shipping: 2500 }).text).toContain('2,500')
  })

  it('omits the delivery address block for a counter sale', () => {
    const mail = order({ deliveryAddress: null })
    expect(mail.html).not.toContain('Delivering to')
    expect(mail.text).not.toContain('Delivering to')
  })

  it('is signed by the shop', () => {
    expect(order().html).toContain(BRAND_NAME)
  })
})

/**
 * The one injection risk in the whole feature: a product name or a customer
 * name typed at the till goes straight into an HTML document. A cashier who
 * names a piece `<b>` should get the characters, not the markup.
 */
describe('escaping', () => {
  it('escapes markup in names rather than rendering it', () => {
    const mail = booking({
      customerName: '<script>alert(1)</script>',
      items: [{ product_name: 'Sofa & "Chair" <set>', quantity: 1, unit_price: 1, subtotal: 1 }],
    })
    expect(mail.html).not.toContain('<script>')
    expect(mail.html).toContain('&lt;script&gt;')
    expect(mail.html).toContain('Sofa &amp; &quot;Chair&quot; &lt;set&gt;')
  })
})
