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
    expect(semantic.surface).toBe(bark[50])
    expect(semantic['text-primary']).toBe(bark[900])
    expect(semantic['border-strong']).toBe(bark[400])
    expect(semantic.ring).toBe(caramel[600])
  })

  /**
   * The layout's one load-bearing colour fact.
   *
   * Every panel on the storefront is separated from its neighbours by the
   * page ground showing through a gap -- no borders, no shadows. That works
   * only while the ground is darker than the panels. Invert the two and the
   * gaps stop being visible, the panels merge into one slab, and the whole
   * page silently loses its structure with nothing in a type check, a build
   * or a contrast gate to notice.
   */
  it('keeps the page ground darker than the panels that sit on it', () => {
    const luminance = (hex: string) =>
      [1, 3, 5]
        .map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
        .reduce((acc, v, i) => acc + v * [0.2126, 0.7152, 0.0722][i], 0)

    expect(luminance(semantic.canvas)).toBeLessThan(luminance(semantic.surface))
    // And paper stays paper: the printed bill must not inherit the tint.
    expect(luminance(semantic.paper)).toBeGreaterThan(luminance(semantic.surface))
  })
})
