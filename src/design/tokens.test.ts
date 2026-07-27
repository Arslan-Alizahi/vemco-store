import { describe, expect, it } from 'vitest'
import { bark, caramel, sage, semantic } from './tokens'

const FULL_RAMP = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']

describe('colour ramps', () => {
  it('bark and caramel expose every step', () => {
    for (const step of FULL_RAMP) {
      expect(bark[step], `bark-${step}`).toMatch(/^#[0-9A-F]{6}$/)
      expect(caramel[step], `caramel-${step}`).toMatch(/^#[0-9A-F]{6}$/)
    }
  })

  it('sage exposes only the steps it is licensed to use', () => {
    expect(Object.keys(sage).sort()).toEqual(['100', '200', '50', '600', '700', '900'].sort())
  })

  it('the whole neutral ramp is warm, not a cool grey', () => {
    // Furniture photography is warm; a cool grey UI makes it look dirty.
    for (const step of FULL_RAMP) {
      const [r, , b] = [1, 3, 5].map(i => parseInt(bark[step].slice(i, i + 2), 16))
      expect(r, `bark-${step} should be warmer than it is cool`).toBeGreaterThan(b)
    }
  })

  it('keeps the brand more saturated than the neutrals at the same step', () => {
    // An all-warm palette fails when the accent and the neutrals share a
    // chroma; the brand then reads as just another brown.
    const chroma = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
      return Math.max(r, g, b) - Math.min(r, g, b)
    }
    for (const step of ['400', '500', '600']) {
      expect(chroma(caramel[step]), `caramel-${step} vs bark-${step}`).toBeGreaterThan(
        chroma(bark[step])
      )
    }
  })

  it('maps semantic aliases onto real ramp values', () => {
    expect(semantic.canvas).toBe(bark[50])
    expect(semantic['text-primary']).toBe(bark[900])
    expect(semantic['border-strong']).toBe(bark[400])
    expect(semantic.ring).toBe(caramel[600])
  })
})
