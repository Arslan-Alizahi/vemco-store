import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'
import { bark, caramel, sage, success, warning, danger, semantic, shadowInk, rgbOf } from './src/design/tokens'
import { durationCss, easing } from './src/design/motion'
import { fontSize } from './src/design/typography'

const config: Config = {
  // Architecture only -- no dark theme ships in this phase. Committing to the
  // class strategy now costs nothing during a migration that is already
  // rewriting every colour call site, and an order of magnitude more later.
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bark,
        caramel,
        sage,
        success,
        warning,
        danger,
        ...semantic,
      },
      fontFamily: {
        sans: ['var(--font-sans)', ...defaultTheme.fontFamily.sans],
        serif: ['var(--font-serif)', ...defaultTheme.fontFamily.serif],
        mono: ['var(--font-mono)', ...defaultTheme.fontFamily.mono],
      },
      // Defined in src/design/typography.ts, because src/lib/cn.ts has to read
      // the same list -- see the note there on why tailwind-merge needs to be
      // told these are sizes and not colours.
      fontSize,
      // Scaled to element size. Card, Modal and a small Button all use
      // rounded-lg (8px) today, and rounded-xl and above have zero uses -- so
      // nothing nests. The nesting is what reads as expensive.
      borderRadius: {
        xs: '0.25rem', // badges, chips, tags
        sm: '0.375rem', // inputs, selects, buttons
        md: '0.625rem', // cards, popovers, dropdowns
        lg: '0.875rem', // modals, sheets, large panels
        xl: '1.25rem', // hero and feature panels
      },
      // Replaces 13 distinct max-w values chosen ad hoc.
      maxWidth: {
        prose: '42rem', // ~68ch -- legal and editorial
        content: '72rem', // default storefront
        wide: '80rem', // grids, galleries
      },
      // Replaces py-6/8/12/16/20 chosen at random at the same structural level.
      spacing: {
        'section-sm': '3rem',
        'section-md': '5rem',
        'section-lg': '7rem',
      },
      // Layered low-opacity shadow plus a hairline ring, in desaturated ink
      // rather than pure black. e0 is the Card default: hairline only -- if
      // everything is raised, depth encodes nothing.
      //
      // Every shadow is mixed from one ink token, and the gradients below are
      // built from ramp colours rather than restated by hand. bg-fade-up was
      // rgb(20 17 14), which is bark-950 written out, and bg-grain-warm was
      // rgb(97 58 19), which is caramel-800: two palette colours living
      // outside the palette, in the one file the colour gate never read.
      boxShadow: {
        e0: `0 0 0 1px rgb(${rgbOf(shadowInk)} / 0.05)`,
        e1: `0 1px 2px rgb(${rgbOf(shadowInk)} / 0.04), 0 0 0 1px rgb(${rgbOf(shadowInk)} / 0.05)`,
        e2: `0 4px 8px -2px rgb(${rgbOf(shadowInk)} / 0.06), 0 2px 4px -2px rgb(${rgbOf(shadowInk)} / 0.04), 0 0 0 1px rgb(${rgbOf(shadowInk)} / 0.06)`,
        e3: `0 16px 32px -8px rgb(${rgbOf(shadowInk)} / 0.12), 0 4px 8px -4px rgb(${rgbOf(shadowInk)} / 0.06), 0 0 0 1px rgb(${rgbOf(shadowInk)} / 0.06)`,
        e4: `0 -4px 16px -4px rgb(${rgbOf(shadowInk)} / 0.08)`,
        // Lift: what a card rises to under the pointer. Two shadows at
        // different blurs read as a real object above a surface, where one
        // soft blur reads as a smudge.
        lift: `0 24px 48px -12px rgb(${rgbOf(shadowInk)} / 0.18), 0 8px 16px -8px rgb(${rgbOf(shadowInk)} / 0.10), 0 0 0 1px rgb(${rgbOf(shadowInk)} / 0.06)`,
        // Float: hero panels and glass. Deep enough to sit clearly in front.
        float: `0 40px 80px -20px rgb(${rgbOf(shadowInk)} / 0.28), 0 12px 24px -12px rgb(${rgbOf(shadowInk)} / 0.14)`,
        // Inset, for pressed states and recessed wells.
        well: `inset 0 2px 4px rgb(${rgbOf(shadowInk)} / 0.08), inset 0 0 0 1px rgb(${rgbOf(shadowInk)} / 0.05)`,
        // A warm rim, for the dark hero where a grey ring would read cold.
        rim: `inset 0 1px 0 rgb(${rgbOf(semantic.surface)} / 0.10), 0 1px 0 rgb(${rgbOf(shadowInk)} / 0.30)`,
      },
      backgroundImage: {
        // Named gradients, so a panel cannot be built from a hand-mixed
        // colour that the token gate would have to allow through.
        'grain-warm':
          `radial-gradient(120% 100% at 50% 0%, rgb(${rgbOf(caramel[800])} / 0.55) 0%, transparent 62%)`,
        'sheen':
          `linear-gradient(135deg, rgb(${rgbOf(semantic.surface)} / 0.14) 0%, rgb(${rgbOf(semantic.surface)} / 0) 45%)`,
        'fade-up':
          `linear-gradient(to top, rgb(${rgbOf(bark[950])} / 0.82) 0%, rgb(${rgbOf(bark[950])} / 0.10) 55%, transparent 100%)`,
      },
      blur: {
        glass: '14px',
      },
      // Replaces seven elements all sitting at z-50, three of which occupy the
      // same bottom-right corner.
      zIndex: {
        dropdown: '100',
        sticky: '200',
        overlay: '300',
        modal: '400',
        popover: '500',
        toast: '600',
        tooltip: '700',
      },
      transitionDuration: durationCss,
      transitionTimingFunction: easing,
      keyframes: {
        // Namespaced deliberately. A bare @keyframes pulse in globals.css
        // currently overrides Tailwind's built-in, which is why every skeleton
        // in the app renders an expanding red ring.
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        // A ring that expands out of an element and fades, to say "this just
        // changed". Was rgb(184 68 47) -- a red belonging to no ramp in this
        // system, left over from the original template. It is caramel now,
        // the accent everything else uses to draw the eye.
        'ring-pulse': {
          '0%': { boxShadow: `0 0 0 0 ${caramel[600]}b3` },
          '70%': { boxShadow: `0 0 0 10px ${caramel[600]}00` },
          '100%': { boxShadow: `0 0 0 0 ${caramel[600]}00` },
        },
      },
      animation: {
        // A skeleton is by definition temporary, so this one may loop.
        shimmer: 'shimmer 1.4s linear infinite',
        // Twice, then it stops. It used to be `infinite`, which is a WCAG
        // 2.2.2 failure the moment anything blinks for more than five seconds
        // without a way to pause it -- and a badge that pulses forever stops
        // meaning "something changed" by the second time you look at it.
        'ring-pulse': 'ring-pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) 2',
      },
    },
  },
  plugins: [],
}

export default config
