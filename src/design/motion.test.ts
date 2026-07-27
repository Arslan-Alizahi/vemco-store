import { describe, expect, it } from 'vitest'
import { duration, durationCss, easing, spring, staggerDelay } from './motion'

describe('motion tokens', () => {
  it('keeps pointer-responsive motion under 180ms', () => {
    expect(duration.instant).toBeLessThanOrEqual(180)
    expect(duration.fast).toBeLessThanOrEqual(180)
    expect(duration.base).toBeLessThanOrEqual(180)
  })

  it('exposes every duration to tailwind as a ms string', () => {
    for (const key of Object.keys(duration)) {
      expect(durationCss[key]).toBe(`${duration[key as keyof typeof duration]}ms`)
    }
  })

  it('defines easing curves as cubic-bezier or linear', () => {
    for (const value of Object.values(easing)) {
      expect(value).toMatch(/^(cubic-bezier\(|linear$)/)
    }
  })

  it('framer presets omit duration alongside spring physics', () => {
    // framer-motion silently ignores `duration` once stiffness/damping are
    // present. Modal and Toast pass both today, so they settle in ~0.8-1s --
    // roughly 3x their stated 0.3s intent.
    expect(spring.overlay).not.toHaveProperty('duration')
    expect(spring.panel).not.toHaveProperty('duration')
    expect(spring.overlay.type).toBe('spring')
  })

  it('caps entrance stagger so refinement never replays a long cascade', () => {
    // Today the product grid uses `index * 0.05`, which replays a 0.55s
    // cascade on every debounced keystroke, sort and page change.
    expect(staggerDelay(0)).toBe(0)
    expect(staggerDelay(3)).toBeCloseTo(0.072)
    expect(staggerDelay(100)).toBeCloseTo(0.144)
    expect(staggerDelay(100)).toBeLessThanOrEqual(0.144)
  })
})
