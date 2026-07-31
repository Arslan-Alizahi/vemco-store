import { describe, expect, it } from 'vitest'
import { normalisePhone } from './customers'

/**
 * The phone number is the customer's identity, so every way of writing one
 * has to land on the same value. Getting this wrong does not throw or fail a
 * build: it quietly files one person as two, each holding half of their
 * history, and nobody notices until somebody asks why a regular is not in
 * the system.
 *
 * Found by typing a number into the till the way a second cashier would.
 * Stripping punctuation alone was not enough, because in Pakistan the
 * leading 0 is a trunk prefix that +92 replaces.
 */
describe('normalisePhone', () => {
  const SAME_LINE = [
    '0300 1234567',
    '0300-1234567',
    '0300 123 4567',
    '(0300) 1234567',
    '+92 300 1234567',
    '+92-300-1234567',
    '0092 300 1234567',
    '92 300 1234567',
    '300 1234567',
    '03001234567',
  ]

  it.each(SAME_LINE)('reads %j as the same number', value => {
    expect(normalisePhone(value)).toBe('03001234567')
  })

  it('keeps every way of writing it on one key', () => {
    expect(new Set(SAME_LINE.map(normalisePhone)).size).toBe(1)
  })

  it('stores the local form, which is what a customer reads out', () => {
    expect(normalisePhone('+923001234567').startsWith('0')).toBe(true)
  })

  it('leaves a landline alone', () => {
    expect(normalisePhone('042 3500 0000')).toBe('04235000000')
  })

  it('returns empty for nothing usable, so it cannot key a customer', () => {
    expect(normalisePhone('')).toBe('')
    expect(normalisePhone('   ')).toBe('')
    expect(normalisePhone('not a phone')).toBe('')
  })

  it('does not mistake a short number for one missing its trunk zero', () => {
    // Nine digits. Prepending a zero here would invent a number.
    expect(normalisePhone('300123456')).toBe('300123456')
  })
})
