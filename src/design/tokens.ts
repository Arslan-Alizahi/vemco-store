/**
 * Single source of truth for colour. Consumed by tailwind.config.ts and by
 * scripts/verify-contrast.mjs, so the WCAG gate asserts against the values
 * the app actually ships rather than a copy that can drift.
 *
 * Product context: furniture. The palette is walnut and caramel -- warm
 * throughout, so the UI reads as the same material family as the product
 * photography rather than sitting on top of it.
 */

/**
 * Bark -- warm grey-brown neutral. The entire UI base.
 *
 * Deliberately lower in chroma than caramel. That gap is what stops the
 * brand from disappearing into the neutrals, which is the failure mode of
 * an all-warm palette.
 *
 * Steps 50-300 are decorative surfaces and hairlines only. 400 is the
 * lightest step permitted to carry meaning, because WCAG 1.4.11 requires
 * 3:1 for UI component boundaries.
 */
export const bark: Record<string, string> = {
  50: '#FAF8F5',
  100: '#F2EEE8',
  200: '#E6E0D6',
  300: '#D3CABB',
  400: '#94897A',
  500: '#756A5D',
  600: '#5C5343',
  700: '#4A4238',
  800: '#342E27',
  900: '#221E19',
  950: '#14110E',
}

/**
 * Caramel -- the brand.
 *
 * Appears on exactly three things: the primary button, the focus ring, and
 * the active nav / selected row indicator. Never on price -- colouring the
 * base price spends the accent on information and leaves no headroom to
 * signal a markdown.
 *
 * 600 is the darkest caramel that still reads as caramel rather than brown;
 * anything lighter cannot carry white text at 4.5:1.
 */
export const caramel: Record<string, string> = {
  50: '#FDF7EF',
  100: '#F9EAD5',
  200: '#F1D3A9',
  300: '#E4B577',
  400: '#D09344',
  500: '#B87A2E',
  600: '#9E6728',
  700: '#7D4C18',
  800: '#613A13',
  900: '#45290E',
  950: '#2B1907',
}

/**
 * Sage -- markdowns and sale tags ONLY.
 *
 * Green against a warm brown palette is the classic walnut-and-foliage
 * pairing, and being the one cool hue in the system makes a discount
 * recognisable at a glance without a label. Deliberately a partial ramp so
 * nobody reaches for an unused step.
 */
export const sage: Record<string, string> = {
  50: '#F2F5F1',
  100: '#E1EADF',
  200: '#C3D5C0',
  600: '#4A6B45',
  700: '#3B5637',
  900: '#24331F',
}

export const success: Record<string, string> = {
  50: '#F1F7F2',
  100: '#DFEDE2',
  // 200 exists so a 100-tinted chip has somewhere to go on hover. Without it
  // the admin toggles had no hover state at all inside their own hue.
  200: '#C4E0CB',
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
/**
 * The ink every shadow and scrim is mixed from.
 *
 * Deliberately its own value rather than a step off the bark ramp: a shadow
 * wants to be a shade cooler and darker than the darkest surface, or it reads
 * as a brown smear rather than an absence of light. It is a token so the
 * shadow scale cannot quietly drift away from the scrim.
 */
export const shadowInk = '#1C1812'

/** `#RRGGBB` to the `R G B` form the modern rgb() syntax takes. */
export const rgbOf = (hex: string): string => {
  const value = parseInt(hex.slice(1), 16)
  return `${(value >> 16) & 255} ${(value >> 8) & 255} ${value & 255}`
}

export const semantic = {
  canvas: bark[50],
  surface: '#FFFFFF',
  'surface-subtle': bark[100],
  'border-subtle': bark[200],
  'border-strong': bark[400],
  'text-primary': bark[900],
  'text-secondary': bark[600],
  'text-tertiary': bark[500],
  ring: caramel[600],
  scrim: `rgb(${rgbOf(shadowInk)} / 0.32)`,
} as const
