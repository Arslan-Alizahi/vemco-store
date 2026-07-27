import { describe, expect, it } from 'vitest'
import { stone, forest, clay, semantic } from './tokens'

const FULL_RAMP = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']

describe('colour ramps', () => {
  it('stone and forest expose every step', () => {
    for (const step of FULL_RAMP) {
      expect(stone[step], `stone-${step}`).toMatch(/^#[0-9A-F]{6}$/)
      expect(forest[step], `forest-${step}`).toMatch(/^#[0-9A-F]{6}$/)
    }
  })

  it('clay exposes only the steps it is licensed to use', () => {
    expect(Object.keys(clay).sort()).toEqual(['100', '200', '50', '600', '700', '900'].sort())
  })

  it('canvas is warm, not a cool grey', () => {
    // Furniture photography is warm; a cool grey canvas makes it look dirty.
    const [r, , b] = [1, 3, 5].map(i => parseInt(stone[50].slice(i, i + 2), 16))
    expect(r).toBeGreaterThan(b)
  })

  it('maps semantic aliases onto real ramp values', () => {
    expect(semantic.canvas).toBe(stone[50])
    expect(semantic['text-primary']).toBe(stone[900])
    expect(semantic['border-strong']).toBe(stone[400])
    expect(semantic.ring).toBe(forest[600])
  })
})
