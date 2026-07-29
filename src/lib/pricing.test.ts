import { describe, expect, it } from 'vitest'
import {
  calculatePagination,
  calculateTax,
  calculateTotal,
  formatAmount,
  formatCurrency,
  generateSKU,
  slugify,
  validateEmail,
} from './utils'

/**
 * Money, and the two things that decide what a customer is shown and charged.
 *
 * The formatting is not cosmetic: the product page once shipped
 * "$168000.00" because it built a price by hand instead of going through
 * here, in a shop that sells in rupees.
 */
describe('formatCurrency', () => {
  it('prices in rupees, not dollars', () => {
    expect(formatCurrency(185_000)).toContain('185,000')
    expect(formatCurrency(185_000)).not.toContain('$')
  })

  it('drops the decimals on whole amounts', () => {
    expect(formatCurrency(185_000)).not.toContain('.')
  })

  it('keeps decimals when there genuinely are some', () => {
    expect(formatCurrency(1234.56)).toContain('.56')
  })

  it('shows zero rather than an empty string', () => {
    expect(formatCurrency(0)).toContain('0')
  })

  it('survives NaN and Infinity instead of printing them at a customer', () => {
    expect(formatCurrency(NaN)).toContain('0')
    expect(formatCurrency(Infinity)).toContain('0')
  })
})

describe('formatAmount', () => {
  it('gives digits with separators and no currency unit', () => {
    expect(formatAmount(312_000)).toBe('312,000')
  })

  it('falls back to zero on a bad number', () => {
    expect(formatAmount(NaN)).toBe('0')
  })
})

describe('tax and totals', () => {
  it('applies the given rate', () => {
    expect(calculateTax(100_000, 0.18)).toBeCloseTo(18_000)
  })

  it('adds tax and shipping and takes off the discount', () => {
    expect(calculateTotal(100_000, 18_000, 2_500, 5_000)).toBe(115_500)
  })

  it('treats the optional parts as zero when they are not passed', () => {
    expect(calculateTotal(100_000)).toBe(100_000)
  })

  it('charges no tax on an empty basket', () => {
    expect(calculateTax(0, 0.18)).toBe(0)
  })
})

describe('pagination', () => {
  it('works out the page count and offset', () => {
    const page = calculatePagination(50, 3, 12)
    expect(page.totalPages).toBe(5)
    expect(page.offset).toBe(24)
  })

  it('knows when it is at either end', () => {
    expect(calculatePagination(50, 1, 12).hasPreviousPage).toBe(false)
    expect(calculatePagination(50, 5, 12).hasNextPage).toBe(false)
    expect(calculatePagination(50, 3, 12).hasNextPage).toBe(true)
  })

  it('reports no pages for no results, rather than one empty one', () => {
    expect(calculatePagination(0, 1, 12).totalPages).toBe(0)
  })
})

describe('validateEmail', () => {
  it('accepts an ordinary address', () => {
    expect(validateEmail('someone@vemco.pk')).toBe(true)
  })

  it.each(['someone', 'someone@', '@vemco.pk', 'someone@vemco', 'a b@vemco.pk', ''])(
    'rejects %j',
    value => {
      expect(validateEmail(value)).toBe(false)
    }
  )
})

describe('slugify', () => {
  it('makes a URL-safe slug', () => {
    expect(slugify('Emerald Velvet Sofa')).toBe('emerald-velvet-sofa')
  })

  it('drops punctuation rather than encoding it', () => {
    expect(slugify('Meridian 3+1+1 Sofa Set!')).not.toMatch(/[+!]/)
  })

  it('does not leave a trailing separator', () => {
    expect(slugify('Dining Table ')).not.toMatch(/-$/)
  })
})

describe('generateSKU', () => {
  it('prefixes with the initials of the product name', () => {
    expect(generateSKU('Emerald Velvet Sofa')).toMatch(/^EVS[0-9A-Z]{4}$/)
  })

  it('caps the prefix at three letters however long the name', () => {
    expect(generateSKU('Kashmir Suede Two Seater Sofa Bed')).toMatch(/^KST[0-9A-Z]{4}$/)
  })

  it('does not repeat itself for the same product', () => {
    expect(generateSKU('Emerald Velvet Sofa')).not.toBe(generateSKU('Emerald Velvet Sofa'))
  })
})
