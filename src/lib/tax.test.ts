import { describe, expect, it } from 'vitest'
import {
  COUNTER_TAX_RATES,
  DEFAULT_COUNTER_TAX_RATE,
  ONLINE_TAX_RATE,
  asCounterTaxRate,
  formatTaxRate,
  taxOn,
  taxRowLabel,
  resolveCounterTax,
} from './tax'

describe('the online shop', () => {
  it('charges no tax at all', () => {
    expect(ONLINE_TAX_RATE).toBe(0)
    expect(taxOn(268_000, ONLINE_TAX_RATE)).toBe(0)
  })
})

describe('the counter', () => {
  it('opens on no tax', () => {
    expect(DEFAULT_COUNTER_TAX_RATE).toBe(0)
  })

  it('offers none, 5, 10 and 18 percent', () => {
    expect([...COUNTER_TAX_RATES]).toEqual([0, 0.05, 0.1, 0.18])
  })

  it('works out each rate', () => {
    expect(taxOn(100_000, 0)).toBe(0)
    expect(taxOn(100_000, 0.05)).toBe(5_000)
    expect(taxOn(100_000, 0.1)).toBe(10_000)
    expect(taxOn(100_000, 0.18)).toBe(18_000)
  })

  /**
   * 5% of 26,533 is 1326.65, and the float underneath is
   * 1326.6500000000001. Unrounded that reaches the database as the stored
   * tax and the receipt's own arithmetic stops adding up in the last
   * decimal place.
   */
  it('rounds to the paisa rather than storing a float artefact', () => {
    expect(taxOn(26_533, 0.05)).toBe(1326.65)
    expect(Number.isInteger(taxOn(26_500, 0.05))).toBe(true)
  })

  it('charges nothing on an empty basket', () => {
    expect(taxOn(0, 0.18)).toBe(0)
  })
})

describe('labels', () => {
  it('says something a person would say out loud', () => {
    expect(formatTaxRate(0)).toBe('No tax')
    expect(formatTaxRate(0.05)).toBe('5%')
    expect(formatTaxRate(0.18)).toBe('18%')
  })

  it('names the rate in the totals row', () => {
    expect(taxRowLabel(0.1)).toBe('Tax (10%)')
    expect(taxRowLabel(0)).toBe('Tax')
  })
})

/**
 * The chosen rate is remembered in the browser between sales, so it comes
 * back as a string, or as a stale value from an older build, or as whatever
 * somebody typed into devtools. Anything the till is not allowed to charge
 * must fall back rather than reach a printed bill.
 */
describe('reading the remembered rate', () => {
  it('accepts a rate the till is allowed to charge', () => {
    expect(asCounterTaxRate('0.05')).toBe(0.05)
    expect(asCounterTaxRate(0.18)).toBe(0.18)
    expect(asCounterTaxRate('0')).toBe(0)
  })

  it.each([null, undefined, '', 'abc', 0.07, 18, -0.05, NaN, {}])(
    'falls back to no tax for %j',
    value => {
      expect(asCounterTaxRate(value)).toBe(DEFAULT_COUNTER_TAX_RATE)
    }
  )
})

/**
 * The regression this whole setting invites.
 *
 * The route used to read `body.tax || default`, so the till's own "None"
 * posted a zero that JavaScript called falsy and the server replaced with
 * 18% -- taxing precisely the sales the owner had said not to tax, on the
 * printed bill, with nothing in the response to show it had happened.
 */
describe('what a posted counter sale is charged', () => {
  it('honours a chosen zero rather than treating it as absent', () => {
    expect(resolveCounterTax(0, 26_500)).toBe(0)
  })

  it('keeps a real amount the till worked out', () => {
    expect(resolveCounterTax(1326.65, 26_533)).toBe(1326.65)
  })

  it.each([null, undefined])('falls back when the field is missing (%j)', value => {
    expect(resolveCounterTax(value, 26_500)).toBe(taxOn(26_500, DEFAULT_COUNTER_TAX_RATE))
  })

  it.each(['nonsense', NaN, -1])('falls back on rubbish (%j)', value => {
    expect(resolveCounterTax(value, 26_500)).toBe(taxOn(26_500, DEFAULT_COUNTER_TAX_RATE))
  })
})
