import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
})

/**
 * jsdom implements neither of these, and both are used by code under test:
 * Modal and Carousel read matchMedia, and ProductCard's stretched-link
 * hover uses IntersectionObserver via next/image.
 */
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

/**
 * jsdom has no layout, so it implements no scrolling. Checkout calls this
 * after moving focus to a failed field; without a stub the call throws inside
 * a requestAnimationFrame callback, where it surfaces as an unhandled error
 * attributed to whichever test happened to be running.
 */
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

if (!window.IntersectionObserver) {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
    root = null
    rootMargin = ''
    thresholds = []
  } as unknown as typeof window.IntersectionObserver
}
