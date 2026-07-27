/**
 * Single source of truth for colour. Consumed by tailwind.config.ts and by
 * scripts/verify-contrast.mjs, so the WCAG gate asserts against the values
 * the app actually ships rather than a copy that can drift.
 *
 * Product context: furniture. Neutrals are warm so they harmonise with oak,
 * walnut, linen and brass -- a cool grey canvas makes warm product
 * photography look dirty. The brand hue is a deep evergreen, chosen to stay
 * legible against that warm photography instead of dissolving into it.
 */

/**
 * Warm neutral -- the entire UI base.
 *
 * Steps 50-300 are decorative surfaces and hairlines only. 400 is the
 * lightest step permitted to carry meaning, because WCAG 1.4.11 requires
 * 3:1 for UI component boundaries. The lightness jump from 300 to 400 is a
 * designed discontinuity, not an uneven ramp.
 */
export const stone: Record<string, string> = {
  50: '#FAF9F6',
  100: '#F3F1EC',
  200: '#E7E3DA',
  300: '#D4CEC1',
  400: '#948A76',
  500: '#7B7263',
  600: '#615949',
  700: '#4A4336',
  800: '#332E25',
  900: '#221F19',
  950: '#14120E',
}

/**
 * Brand -- deep evergreen.
 *
 * Appears on exactly three things: the primary button, the focus ring, and
 * the active nav / selected row indicator. Never on price: colouring the
 * base price spends the accent on information and leaves no headroom to
 * signal a markdown.
 */
export const forest: Record<string, string> = {
  50: '#F1F6F1',
  100: '#DEEADE',
  200: '#BDD4BF',
  300: '#93B698',
  400: '#639172',
  500: '#42714F',
  600: '#2F5A3D',
  700: '#254832',
  800: '#1E3928',
  900: '#182E20',
  950: '#0C1A12',
}

/**
 * Secondary accent -- markdowns and sale tags ONLY.
 *
 * Because clay appears nowhere else in the interface, a discounted price is
 * recognisable at a glance without needing a label. Deliberately a partial
 * ramp: the unused steps are omitted so nobody reaches for one.
 */
export const clay: Record<string, string> = {
  50: '#FDF5F1',
  100: '#F9E7DE',
  200: '#F0CBB9',
  600: '#A64E2C',
  700: '#873E22',
  900: '#4E2414',
}

export const success: Record<string, string> = {
  50: '#F1F7F2',
  100: '#DFEDE2',
  600: '#2F7D4A',
  700: '#246239',
  900: '#173D24',
}

export const warning: Record<string, string> = {
  50: '#FDF6EC',
  100: '#F8E9D3',
  600: '#9C5F00',
  700: '#7E4C00',
  900: '#4A2C00',
}

export const danger: Record<string, string> = {
  50: '#FDF4F2',
  100: '#FAE4E0',
  600: '#B8442F',
  700: '#963626',
  900: '#571F16',
}

/**
 * Components consume these, never a raw ramp step. The indirection is what
 * makes a future dark theme a token swap rather than a rewrite.
 */
export const semantic = {
  canvas: stone[50],
  surface: '#FFFFFF',
  'surface-subtle': stone[100],
  'border-subtle': stone[200],
  'border-strong': stone[400],
  'text-primary': stone[900],
  'text-secondary': stone[600],
  'text-tertiary': stone[500],
  ring: forest[600],
  scrim: 'rgb(28 24 18 / 0.32)',
} as const
