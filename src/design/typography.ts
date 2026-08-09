/**
 * The role-named type scale, and the single source of truth for it.
 *
 * It lives here rather than inline in tailwind.config.ts because two things
 * need to agree on the list. Tailwind generates the classes from it, and
 * tailwind-merge has to be told that these names are font sizes.
 *
 * Without that second consumer, `text-body` looks to tailwind-merge exactly
 * like a colour -- `text-` plus a word it does not recognise -- so it puts
 * `text-white` and `text-body` in the same conflict group and drops the one
 * that came first. The primary button shipped as bark-900 on caramel-600 at
 * 3.49:1 for that reason: `cn()` had quietly deleted its `text-white` before
 * it ever reached the DOM. Nothing in a type check, a build or a review can
 * see a class that was removed at runtime; only axe on the rendered page did.
 *
 * Leading, tracking and weight are baked into each entry so a heading cannot
 * ship untuned. Negative tracking at display sizes is the highest-yield
 * typographic change here.
 */

type TypeStyle = [string, { lineHeight: string; letterSpacing: string; fontWeight: string }]

export const fontSize = {
  /**
   * The editorial voice: one headline per page, set in the serif at regular
   * weight.
   *
   * Regular, not semibold. At 72px a serif carries on its shape, and the
   * bold weight of a text face at display size reads as shouting rather than
   * as confidence -- which is the single most common way a furniture site
   * ends up looking like a sale flyer. Leading below 1 lets the two lines
   * lock together as a block, which is what makes the hero feel composed.
   */
  hero: ['4.5rem', { lineHeight: '0.98', letterSpacing: '-0.028em', fontWeight: '400' }],
  /**
   * Section headings in the same editorial voice, a step down.
   */
  'display-serif': ['2.75rem', { lineHeight: '1.06', letterSpacing: '-0.022em', fontWeight: '400' }],
  /**
   * The small caps label above a section: MATERIALS, FEATURED PIECES.
   *
   * Tracking this wide is what makes eleven pixels of uppercase legible
   * rather than a smear -- and it is the piece of typography that does the
   * most to place the page, because letterspaced caps over a serif headline
   * is how furniture and fashion have set a section label for a century.
   */
  eyebrow: ['0.6875rem', { lineHeight: '1.30', letterSpacing: '0.170em', fontWeight: '500' }],
  display: ['3.5rem', { lineHeight: '1.05', letterSpacing: '-0.030em', fontWeight: '600' }],
  h1: ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.022em', fontWeight: '600' }],
  h2: ['1.5rem', { lineHeight: '1.25', letterSpacing: '-0.017em', fontWeight: '600' }],
  h3: ['1.125rem', { lineHeight: '1.40', letterSpacing: '-0.011em', fontWeight: '600' }],
  'body-lg': ['1.0625rem', { lineHeight: '1.60', letterSpacing: '0em', fontWeight: '400' }],
  body: ['0.9375rem', { lineHeight: '1.55', letterSpacing: '0em', fontWeight: '400' }],
  ui: ['0.875rem', { lineHeight: '1.45', letterSpacing: '0em', fontWeight: '400' }],
  caption: ['0.75rem', { lineHeight: '1.40', letterSpacing: '0.005em', fontWeight: '500' }],
  overline: ['0.6875rem', { lineHeight: '1.30', letterSpacing: '0.060em', fontWeight: '600' }],
} satisfies Record<string, TypeStyle>

/** The role names, for tailwind-merge's font-size class group. */
export const fontSizeNames = Object.keys(fontSize)
