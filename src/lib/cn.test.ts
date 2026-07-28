import { describe, expect, it } from 'vitest'
import { cn } from './cn'
import { fontSizeNames } from '@/design/typography'

/**
 * These exist because the failure they describe is invisible everywhere except
 * on the rendered page. A dropped class type-checks, builds, and reviews
 * clean; only axe running against real markup caught it.
 */
describe('cn', () => {
  it('keeps a text colour alongside every role-named size', () => {
    for (const size of fontSizeNames) {
      const result = cn('text-white', `text-${size}`)
      expect(result, `text-${size} swallowed the colour`).toBe(`text-white text-${size}`)
    }
  })

  it('keeps the size alongside a colour written in the other order', () => {
    expect(cn('text-body', 'text-caramel-700')).toBe('text-body text-caramel-700')
  })

  it('reproduces the button case that shipped at 3.49:1', () => {
    // cva emits the variant before the size, so the size always arrived second.
    expect(cn('bg-caramel-600 text-white hover:bg-caramel-700', 'h-11 px-5 text-body')).toContain(
      'text-white'
    )
  })

  it('still resolves genuine conflicts', () => {
    expect(cn('text-white', 'text-caramel-700')).toBe('text-caramel-700')
    expect(cn('text-body', 'text-h1')).toBe('text-h1')
    expect(cn('px-3', 'px-5')).toBe('px-5')
  })

  it('still merges Tailwind built-in sizes correctly', () => {
    expect(cn('text-white', 'text-sm')).toBe('text-white text-sm')
  })
})
