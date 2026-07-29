import { describe, expect, it } from 'vitest'
import { CURRENCY, fromStripeAmount, stripeCurrency, toStripeAmount } from './currency'
import { formatCurrency } from './utils'

/**
 * The currency was stated in four places: the display formatter said PKR, and
 * the Stripe integration said 'usd' in three separate spots while multiplying
 * a rupee total by 100. A Rs 185,000 sofa therefore went to Stripe as
 * 18,500,000 minor units of US dollars -- about $185,000, roughly two hundred
 * and eighty times the intended charge.
 *
 * These tests exist so that can never be true again without one of them
 * going red.
 */
describe('the shop and Stripe agree on the currency', () => {
  it('sends Stripe the same currency the shop displays', () => {
    expect(stripeCurrency()).toBe(CURRENCY.toLowerCase())
  })

  it('displays prices in that currency', () => {
    // PKR by default. If a deployment overrides it, the formatter follows.
    expect(formatCurrency(185_000)).not.toContain('$')
  })
})

describe('converting to Stripe amounts', () => {
  it('converts a whole amount to minor units', () => {
    expect(toStripeAmount(185_000)).toBe(18_500_000)
  })

  it('rounds rather than truncating, so a paisa is not lost', () => {
    expect(toStripeAmount(1234.567)).toBe(123_457)
  })

  it('round-trips back to the original amount', () => {
    for (const amount of [0, 1, 2_500, 185_000, 312_000.5]) {
      expect(fromStripeAmount(toStripeAmount(amount))).toBeCloseTo(amount, 2)
    }
  })

  it('never produces a fractional amount, which Stripe rejects', () => {
    for (const amount of [1234.567, 0.005, 99_999.999]) {
      expect(Number.isInteger(toStripeAmount(amount))).toBe(true)
    }
  })
})
