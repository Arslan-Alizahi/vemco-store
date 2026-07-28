import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'
import { bark, caramel, sage, success, warning, danger, semantic } from './src/design/tokens'
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
