import { describe, expect, it } from 'vitest'
import { NEXT_STEP, enquiryForShopMail, enquiryReceivedMail } from './enquiry'
import { BRAND_ADDRESS, BRAND_EMAIL, BRAND_PHONES } from '@/lib/brand'

/**
 * These two messages are the entire online business.
 *
 * Nothing is paid for and nothing is held, so the only thing either of them
 * achieves is a telephone call. If the customer's copy loses the reference or
 * the numbers, the instruction on the confirmation page dies the moment the
 * tab is closed; if the shop's copy buries the caller's number, the lead
 * waits until somebody has time to read a summary.
 */

const ENQUIRY = {
  reference: 'VIM-K7R2QX',
  intent: 'visit' as const,
  customer_name: 'Bilal Ahmed',
  customer_phone: '0300 9125757',
  customer_email: 'bilal@example.com',
  city: 'Haripur',
  visit_date: '2026-09-01',
  message: 'Is the velvet available in green?',
  items_total: 268_000,
  items: [
    {
      product_name: 'Regent Tufted Wingback Bed',
      quantity: 1,
      unit_price: 268_000,
      subtotal: 268_000,
    },
  ],
}

const received = (overrides = {}) =>
  enquiryReceivedMail({ to: 'bilal@example.com', enquiry: { ...ENQUIRY, ...overrides } })

const forShop = (overrides = {}) =>
  enquiryForShopMail({ to: BRAND_EMAIL, enquiry: { ...ENQUIRY, ...overrides } })

describe("the customer's copy", () => {
  it('carries the reference in the subject and the body', () => {
    const mail = received()
    expect(mail.subject).toContain('VIM-K7R2QX')
    expect(mail.html).toContain('VIM-K7R2QX')
    expect(mail.text).toContain('VIM-K7R2QX')
  })

  it('gives both phone lines and the address', () => {
    const mail = received()
    for (const part of [mail.html, mail.text]) {
      for (const phone of BRAND_PHONES) expect(part).toContain(phone)
      expect(part).toContain(BRAND_ADDRESS)
    }
  })

  it('makes the numbers tappable rather than only readable', () => {
    expect(received().html).toContain('href="tel:+923009125757"')
  })

  /**
   * The one way this flow can go wrong for a customer: they assume the form
   * held the sofa, come back on Saturday, and find it sold. Say it plainly,
   * in both parts, every time.
   */
  it('says that nothing is charged and nothing is held', () => {
    const mail = received()
    for (const part of [mail.html, mail.text]) {
      expect(part).toMatch(/nothing is being held/i)
      expect(part).toMatch(/nothing has been charged/i)
    }
  })

  it('tells each kind of enquirer what to do next', () => {
    expect(received({ intent: 'visit' }).text).toContain(NEXT_STEP.visit)
    expect(received({ intent: 'reserve' }).text).toContain(NEXT_STEP.reserve)
    expect(received({ intent: 'delivery' }).text).toContain(NEXT_STEP.delivery)
  })

  it('warns a reserver that only an advance holds the piece', () => {
    expect(received({ intent: 'reserve' }).text).toMatch(/advance is paid/i)
  })

  it('promises the refund to somebody booking a visit', () => {
    expect(received({ intent: 'visit' }).text).toMatch(/comes straight back to you/i)
  })

  it('lists what they were looking at, and what it was listed at', () => {
    const mail = received()
    expect(mail.text).toContain('Regent Tufted Wingback Bed')
    expect(mail.text).toContain('268,000')
  })
})

describe("the shop's copy", () => {
  it('puts the caller and their number in the subject, so it reads on a lock screen', () => {
    const subject = forShop().subject
    expect(subject).toContain('Bilal Ahmed')
    expect(subject).toContain('0300 9125757')
    expect(subject).toContain('VIM-K7R2QX')
  })

  it('makes the customer number the first thing that can be tapped', () => {
    expect(forShop().html).toContain('href="tel:+923009125757"')
  })

  it('carries the visit date when there is one, and omits it otherwise', () => {
    expect(forShop().text).toMatch(/Visit on/)
    expect(forShop({ intent: 'delivery', visit_date: null }).text).not.toMatch(/Visit on/)
  })

  it('passes on what the customer actually asked', () => {
    expect(forShop().text).toContain('Is the velvet available in green?')
  })

  it('leaves out the fields the customer did not fill in', () => {
    const mail = forShop({ city: null, customer_email: null, message: null })
    expect(mail.text).not.toMatch(/^City:/m)
    expect(mail.text).not.toMatch(/^Email:/m)
    expect(mail.text).not.toMatch(/They said/)
  })
})

/**
 * A product name and a customer name are typed by strangers and dropped into
 * an HTML document. Somebody called `<b>` gets the characters.
 */
describe('escaping', () => {
  it('escapes markup in names rather than rendering it', () => {
    const mail = forShop({
      customer_name: '<script>alert(1)</script>',
      message: 'Sofa & "Chair" <set>',
    })
    expect(mail.html).not.toContain('<script>')
    expect(mail.html).toContain('&lt;script&gt;')
    expect(mail.html).toContain('Sofa &amp; &quot;Chair&quot; &lt;set&gt;')
  })
})
