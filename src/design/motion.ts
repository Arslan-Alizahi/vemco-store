/**
 * Single source of truth for motion.
 *
 * tailwind.config.ts imports durationCss and easing; framer-motion
 * components import spring and fade. CSS and JS therefore animate on
 * identical values.
 *
 * This replaces three independent systems that shared no values: Tailwind
 * animation entries with durations hardcoded inline, framer-motion configs
 * hand-typed across 22 files, and raw CSS transitions ranging from 0.2s to
 * 3s. Tuning motion previously meant editing all three.
 *
 * Governing rule: nothing that responds to a pointer exceeds 180ms.
 */

export const duration = {
  instant: 80, // colour/opacity on hover, checkbox tick
  fast: 120, // button and input state change, focus ring, row hover
  base: 180, // dropdown/popover enter, tab indicator slide
  slow: 260, // modal and toast enter, page-level crossfade
  slower: 400, // sheet/drawer slide only
} as const

/** Tailwind needs ms strings; keep them derived so the two cannot diverge. */
export const durationCss: Record<string, string> = Object.fromEntries(
  Object.entries(duration).map(([key, value]) => [key, `${value}ms`])
)

export const easing = {
  standard: 'cubic-bezier(0.2, 0, 0, 1)', // decelerate -- the default for ~90% of UI
  exit: 'cubic-bezier(0.4, 0, 1, 1)', // accelerate out; exits run at 0.75x enter
  emphasis: 'cubic-bezier(0.2, 0, 0, 1.2)', // slight overshoot, used sparingly
  linear: 'linear', // spinners and indeterminate progress only
} as const

/**
 * framer-motion presets. Never pass `duration` alongside these -- framer
 * ignores it once physics parameters are present, which is exactly the bug
 * Modal and Toast ship today.
 */
export const spring = {
  overlay: { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 }, // ~230ms, no bounce
  panel: { type: 'spring', stiffness: 320, damping: 32, mass: 1.0 }, // sheets, drawers
} as const

export const fade = {
  duration: duration.base / 1000,
  ease: easing.standard,
} as const

/**
 * Entrance stagger, capped at six items (144ms total).
 *
 * Staggers are first-mount only. Grid refinement uses a crossfade instead,
 * so filtering never makes the user wait out a cascade to scan results.
 */
export const staggerDelay = (index: number): number => (Math.min(index, 6) * 24) / 1000
