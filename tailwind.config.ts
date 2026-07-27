import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'
import { stone, forest, clay, success, warning, danger, semantic } from './src/design/tokens'
import { durationCss, easing } from './src/design/motion'

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
        stone,
        forest,
        clay,
        success,
        warning,
        danger,
        ...semantic,
        // Compatibility aliases. Roughly 870 call sites still reference these
        // names; they are retired in Task 7 once .gradient-text no longer
        // @applies to-accent-500.
        primary: forest,
        accent: clay,
      },
      fontFamily: {
        sans: ['var(--font-sans)', ...defaultTheme.fontFamily.sans],
        serif: ['var(--font-serif)', ...defaultTheme.fontFamily.serif],
        mono: ['var(--font-mono)', ...defaultTheme.fontFamily.mono],
      },
      // Role-named, with leading/tracking/weight baked in so a heading cannot
      // ship untuned. Replaces 53 distinct heading class strings across three
      // semantic levels. Negative tracking at display sizes is the single
      // highest-yield typographic change here -- the codebase currently has
      // zero uses of tracking-tight and 55 uses of leading-relaxed applied
      // uniformly, including to 36-60px headings that want 1.05-1.15.
      fontSize: {
        display: ['3.5rem', { lineHeight: '1.05', letterSpacing: '-0.030em', fontWeight: '600' }],
        h1: ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.022em', fontWeight: '600' }],
        h2: ['1.5rem', { lineHeight: '1.25', letterSpacing: '-0.017em', fontWeight: '600' }],
        h3: ['1.125rem', { lineHeight: '1.40', letterSpacing: '-0.011em', fontWeight: '600' }],
        'body-lg': ['1.0625rem', { lineHeight: '1.60', letterSpacing: '0em', fontWeight: '400' }],
        body: ['0.9375rem', { lineHeight: '1.55', letterSpacing: '0em', fontWeight: '400' }],
        ui: ['0.875rem', { lineHeight: '1.45', letterSpacing: '0em', fontWeight: '400' }],
        caption: ['0.75rem', { lineHeight: '1.40', letterSpacing: '0.005em', fontWeight: '500' }],
        overline: ['0.6875rem', { lineHeight: '1.30', letterSpacing: '0.060em', fontWeight: '600' }],
      },
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
      // rather than pure black. e0 is the Card default: hairline only. Today
      // shadow-md is the resting state of every surface, so depth encodes
      // nothing.
      boxShadow: {
        e0: '0 0 0 1px rgb(28 24 18 / 0.05)',
        e1: '0 1px 2px rgb(28 24 18 / 0.04), 0 0 0 1px rgb(28 24 18 / 0.05)',
        e2: '0 4px 8px -2px rgb(28 24 18 / 0.06), 0 2px 4px -2px rgb(28 24 18 / 0.04), 0 0 0 1px rgb(28 24 18 / 0.06)',
        e3: '0 16px 32px -8px rgb(28 24 18 / 0.12), 0 4px 8px -4px rgb(28 24 18 / 0.06), 0 0 0 1px rgb(28 24 18 / 0.06)',
        e4: '0 -4px 16px -4px rgb(28 24 18 / 0.08)',
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
        'ring-pulse': {
          '0%': { boxShadow: '0 0 0 0 rgb(184 68 47 / 0.7)' },
          '70%': { boxShadow: '0 0 0 10px rgb(184 68 47 / 0)' },
          '100%': { boxShadow: '0 0 0 0 rgb(184 68 47 / 0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s linear infinite',
        'ring-pulse': 'ring-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}

export default config
