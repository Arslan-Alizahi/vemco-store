# Storefront Foundation (Phases 0, 0.5, 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get `npm run build` green, land a verification gate that can catch regressions, and replace the decorative token layer with a real one — so every later phase has a foundation to build on and a way to prove it did not break anything.

**Architecture:** Three sequential stages. First unbreak the build (type errors plus two missing Suspense boundaries), because nothing downstream is verifiable without it. Then install a thin gate — Vitest, an axe smoke test, and a contrast assertion suite — *before* the migration, not after. Then rewrite `tailwind.config.ts` into a real token system and demolish the competing style system in `globals.css`. No page markup is migrated in this plan; that is Phase 2 onward.

**Tech Stack:** Next.js 14.2.18 (App Router), React 18, TypeScript 5.7 strict, Tailwind CSS 3.4, Vitest, @axe-core/playwright, next/font.

## Global Constraints

- Design spec of record: `docs/superpowers/specs/2026-07-27-storefront-redesign-design.md`. Where this plan and the spec disagree, the spec wins.
- Product context: **furniture e-commerce**. Warm neutrals; the accent must separate from warm product photography, never blend into it.
- WCAG **AA is a hard floor**. Body text ≥ 4.5:1, UI boundaries and focus indicators ≥ 3:1. Any token change must keep `npm run verify:contrast` at 23/23.
- Token names are exactly `stone`, `forest`, `clay`, `success`, `warning`, `danger`. The names `primary`, `accent`, `info`, `gray` are retired.
- Do **not** touch `src/components/ui/AdminAuth.tsx` beyond what is required to keep the build green. It is explicitly out of scope (see spec §6).
- Do **not** change `src/lib/stripe.ts` `apiVersion`. Out of scope (spec §6).
- Commit after every task. Never use `--no-verify`.
- Node 22.20.0, npm 10.9.3.

---

## File Structure

**Created**
- `vitest.config.ts` — test runner config, node environment
- `scripts/verify-contrast.mjs` — WCAG assertion suite, reads the real token file
- `src/design/tokens.ts` — single source of truth for colour ramps; consumed by both `tailwind.config.ts` and the contrast verifier
- `src/design/motion.ts` — duration/easing constants; consumed by `tailwind.config.ts` and framer-motion
- `src/design/tokens.test.ts` — asserts ramp shape and that retired names are gone
- `src/design/motion.test.ts` — asserts motion token shape
- `src/app/icon.svg`, `src/app/apple-icon.png`, `src/app/opengraph-image.png`, `src/app/manifest.ts`
- `.github/workflows/ci.yml`

**Modified**
- `src/types/product.ts` — add `primary_image`
- `src/components/ui/ImageUpload.tsx:5` — remove phantom import
- `src/app/admin/page.tsx:567` — form reset omits `image_url`
- `src/app/admin/revenue/page.tsx:374` — `noPadding` on wrong element
- `src/app/api/**` — narrow `unknown` results from better-sqlite3
- `src/app/(storefront)/order/success/page.tsx`, `order/cancel/page.tsx` — Suspense boundaries
- `src/app/layout.tsx` — fonts, MotionConfig, metadata template
- `tailwind.config.ts` — full token rewrite
- `src/app/globals.css` — demolition
- `src/components/ui/Button.tsx:9` — remove `btn-hover-lift`
- `src/components/ui/Card.tsx` — remove `hover3D`
- `package.json` — scripts and devDependencies

---

## Task 1: Make the type checker pass

**Files:**
- Modify: `src/types/product.ts`
- Modify: `src/components/ui/ImageUpload.tsx:5`
- Modify: `src/app/admin/page.tsx:567`
- Modify: `src/app/admin/revenue/page.tsx:363,374`

**Interfaces:**
- Consumes: nothing
- Produces: `Product` gains `primary_image?: string`. Later tasks and all later phases rely on this field existing on the type.

- [ ] **Step 1: Run the type checker and record the baseline**

Run: `npx tsc --noEmit`
Expected: 23 errors. Save the output; you will diff against it.

- [ ] **Step 2: Add the missing field to the Product type**

This single line clears 5 errors across 4 files. The API already returns this column (`src/app/api/products/route.ts:31` selects it as `primary_image`); only the type was missing.

In `src/types/product.ts`, inside `interface Product`, after the `category_name?: string` line:

```typescript
  primary_image?: string
```

- [ ] **Step 3: Remove the phantom Button import**

`src/components/ui/ImageUpload.tsx:5` imports a named export that does not exist — `Button.tsx` has only a default export. The import is also unused.

Delete this line entirely:

```typescript
import { Button } from './Button'
```

- [ ] **Step 4: Fix the product form reset**

`src/app/admin/page.tsx:567` resets the form without `image_url`, which is both a type error and a real bug: clicking "Add Product" after editing carries the previous product's image into the new one.

Find the `setProductForm({...})` call inside the "Add Product" button's `onClick` and add the missing field so the object matches the state shape:

```typescript
                  setProductForm({
                    name: '',
                    description: '',
                    sku: '',
                    category_id: '',
                    price: '',
                    stock_quantity: '',
                    is_featured: false,
                    image_url: '',
                  })
```

- [ ] **Step 5: Move noPadding to the element that accepts it**

`CardContent` does not accept `noPadding`; `Card` does. Today the prop is spread onto the DOM (React warns) and the Recent Transactions table is visibly inset.

In `src/app/admin/revenue/page.tsx`, change the `<Card>` / `<CardContent noPadding>` pair so the prop sits on `Card`:

```tsx
            <Card noPadding>
              <CardContent>
```

- [ ] **Step 6: Verify only the API-route errors remain**

Run: `npx tsc --noEmit`
Expected: 9 errors, all under `src/app/api/` plus `src/lib/stripe.ts`. The 14 UI errors are gone.

- [ ] **Step 7: Commit**

```bash
git add src/types/product.ts src/components/ui/ImageUpload.tsx src/app/admin/page.tsx src/app/admin/revenue/page.tsx
git commit -m "fix: clear UI type errors blocking the production build"
```

---

## Task 2: Type the database results in API routes

**Files:**
- Modify: `src/app/api/billing/route.ts:86-90`
- Modify: `src/app/api/orders/route.ts:142-146`
- Modify: `src/app/api/orders/[id]/status/route.ts:62-66`
- Modify: `src/app/api/products/[id]/route.ts:27,39,50`
- Modify: `src/app/api/products/slug/[slug]/route.ts:29,47,66`
- Modify: `src/app/api/social-media/route.ts:79`
- Modify: `src/app/api/social-media/[id]/route.ts:91,121`

**Interfaces:**
- Consumes: nothing
- Produces: no new exports. Runtime behaviour must be identical.

**Why this is delicate:** three of these are on the money path — receipt creation, order creation, order status. There are no tests. Change *only* the types. Do not restructure the queries.

- [ ] **Step 1: Narrow the spread-of-unknown errors**

`better-sqlite3`'s `.get()` returns `unknown`, which cannot be spread. Add an assertion at the point of retrieval, not at the spread.

In `src/app/api/billing/route.ts`, change line 86:

```typescript
      const receipt = db.prepare('SELECT * FROM billing_receipts WHERE id = ?').get(receiptId) as Record<string, unknown>
```

In `src/app/api/orders/route.ts`, change line 142:

```typescript
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as Record<string, unknown>
```

In `src/app/api/orders/[id]/status/route.ts`, change line 62:

```typescript
    const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as Record<string, unknown>
```

- [ ] **Step 2: Type the product lookups**

In `src/app/api/products/[id]/route.ts`, change line 27:

```typescript
    const product = db.prepare(sql).get(isNumeric ? parseInt(identifier) : identifier) as { id: number; category_id: number | null } | undefined
```

In `src/app/api/products/slug/[slug]/route.ts`, change line 29:

```typescript
      .get(slug) as { id: number; category_id: number | null } | undefined
```

- [ ] **Step 3: Fix the apiResponse misuse**

`apiResponse(data, success, message)` — the second parameter is a boolean. Three call sites pass a message string there, so `success` becomes a truthy string and the message is lost. Pass `true` explicitly.

In `src/app/api/social-media/route.ts:79`:

```typescript
    return NextResponse.json(apiResponse(newLink, true, 'Social media link created successfully'), {
```

In `src/app/api/social-media/[id]/route.ts:91`:

```typescript
    return NextResponse.json(apiResponse(updatedLink, true, 'Social media link updated successfully'))
```

In `src/app/api/social-media/[id]/route.ts:121`:

```typescript
    return NextResponse.json(apiResponse(null, true, 'Social media link deleted successfully'))
```

- [ ] **Step 4: Verify only the Stripe error remains**

Run: `npx tsc --noEmit`
Expected: 1 error, `src/lib/stripe.ts(12,7)`. That one is deliberately out of scope.

- [ ] **Step 5: Silence the out-of-scope Stripe error without changing behaviour**

Bumping the API version is a live payment-behaviour change (spec §6). Pin the type instead, and leave a marker.

In `src/lib/stripe.ts`, replace the `apiVersion` line:

```typescript
      // Pinned deliberately. Bumping this changes Stripe response shapes and
      // belongs to a payments task with its own verification, not a type fix.
      apiVersion: '2024-11-20.acacia' as Stripe.LatestApiVersion,
```

- [ ] **Step 6: Verify a clean type check**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 7: Commit**

```bash
git add src/app/api src/lib/stripe.ts
git commit -m "fix: type database results and correct apiResponse argument order"
```

---

## Task 3: Add the missing Suspense boundaries

**Files:**
- Modify: `src/app/(storefront)/order/success/page.tsx`
- Modify: `src/app/(storefront)/order/cancel/page.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: nothing

**Why:** both pages call `useSearchParams()` in a client component with no boundary. In Next 14 that is a hard `next build` failure, currently masked because type-checking fails first. `products/page.tsx:301` already has the correct pattern — copy it. **Clearing type errors alone does not make the build green.**

- [ ] **Step 1: Confirm the build still fails**

Run: `npm run build`
Expected: FAIL — `useSearchParams() should be wrapped in a suspense boundary at page "/order/success"`.

- [ ] **Step 2: Wrap the success page**

In `src/app/(storefront)/order/success/page.tsx`, add `Suspense` to the React import, rename the existing default export to an inner component, and add a new default export:

```tsx
import { Suspense, useEffect, useState } from 'react'
```

Rename `export default function OrderSuccessPage()` to:

```tsx
function OrderSuccessContent() {
```

Then append at the end of the file:

```tsx
export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  )
}
```

- [ ] **Step 3: Wrap the cancel page**

Apply the identical transformation to `src/app/(storefront)/order/cancel/page.tsx`: add `Suspense` to the import, rename the component to `OrderCancelContent`, and append:

```tsx
export default function OrderCancelPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      }
    >
      <OrderCancelContent />
    </Suspense>
  )
}
```

- [ ] **Step 4: Verify the build is green**

Run: `npm run build`
Expected: `✓ Compiled successfully`, route table printed, exit code 0. **This is the first green build in the project's history — do not proceed past this step until it passes.**

- [ ] **Step 5: Commit**

```bash
git add "src/app/(storefront)/order"
git commit -m "fix: wrap useSearchParams pages in Suspense boundaries"
```

---

## Task 4: Install the test runner and the contrast gate

**Files:**
- Create: `vitest.config.ts`
- Create: `src/design/tokens.ts`
- Create: `src/design/tokens.test.ts`
- Create: `scripts/verify-contrast.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing
- Produces: `src/design/tokens.ts` exports `stone`, `forest`, `clay`, `success`, `warning`, `danger` — each a `Record<string, string>` of hex values — plus `semantic`. Task 6 imports these into `tailwind.config.ts`. `scripts/verify-contrast.mjs` imports the same file, so the assertion runs against shipped values rather than a copy.

- [ ] **Step 1: Install dev dependencies**

```bash
npm install -D vitest@^2.1.8 tsx@^4.19.2
```

- [ ] **Step 2: Add the config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

- [ ] **Step 3: Add the scripts**

In `package.json`, replace the `scripts` block:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "verify:contrast": "node scripts/verify-contrast.mjs",
    "verify": "npm run typecheck && npm run test && npm run verify:contrast && npm run build"
  },
```

- [ ] **Step 4: Write the failing token test**

Create `src/design/tokens.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { stone, forest, clay, semantic } from './tokens'

const FULL_RAMP = ['50','100','200','300','400','500','600','700','800','900','950']

describe('colour ramps', () => {
  it('stone and forest expose every step', () => {
    for (const step of FULL_RAMP) {
      expect(stone[step], `stone-${step}`).toMatch(/^#[0-9A-F]{6}$/)
      expect(forest[step], `forest-${step}`).toMatch(/^#[0-9A-F]{6}$/)
    }
  })

  it('clay exposes only the steps it is licensed to use', () => {
    expect(Object.keys(clay).sort()).toEqual(['100','200','50','600','700','900'].sort())
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
```

- [ ] **Step 5: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./tokens"`.

- [ ] **Step 6: Write the token module**

Create `src/design/tokens.ts`:

```typescript
/**
 * Single source of truth for colour. Consumed by tailwind.config.ts and by
 * scripts/verify-contrast.mjs, so the contrast gate asserts against the
 * values the app actually ships.
 *
 * Product context: furniture. Neutrals are warm so they harmonise with oak,
 * walnut, linen and brass. The brand hue is a deep evergreen chosen to stay
 * legible against warm product photography instead of dissolving into it.
 */

/** Warm neutral. Steps 50-300 are decorative surfaces only; 400 is the
 *  lightest step permitted to carry meaning (WCAG 1.4.11 needs 3:1). */
export const stone: Record<string, string> = {
  50:  '#FAF9F6',
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

/** Brand. Appears on exactly three things: primary button, focus ring,
 *  active nav / selected row. Never on price. */
export const forest: Record<string, string> = {
  50:  '#F1F6F1',
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

/** Secondary accent. Markdowns and sale tags ONLY — because it appears
 *  nowhere else, a discount is recognisable without a label. */
export const clay: Record<string, string> = {
  50:  '#FDF5F1',
  100: '#F9E7DE',
  200: '#F0CBB9',
  600: '#A64E2C',
  700: '#873E22',
  900: '#4E2414',
}

export const success: Record<string, string> = {
  50: '#F1F7F2', 100: '#DFEDE2', 600: '#2F7D4A', 700: '#246239', 900: '#173D24',
}
export const warning: Record<string, string> = {
  50: '#FDF6EC', 100: '#F8E9D3', 600: '#9C5F00', 700: '#7E4C00', 900: '#4A2C00',
}
export const danger: Record<string, string> = {
  50: '#FDF4F2', 100: '#FAE4E0', 600: '#B8442F', 700: '#963626', 900: '#571F16',
}

/** Components consume these, never a raw ramp step. */
export const semantic = {
  canvas:           stone[50],
  surface:          '#FFFFFF',
  'surface-subtle': stone[100],
  'border-subtle':  stone[200],
  'border-strong':  stone[400],
  'text-primary':   stone[900],
  'text-secondary': stone[600],
  'text-tertiary':  stone[500],
  ring:             forest[600],
  scrim:            'rgb(28 24 18 / 0.32)',
} as const
```

- [ ] **Step 7: Run the test to confirm it passes**

Run: `npm test`
Expected: PASS, 4 tests.

- [ ] **Step 8: Write the contrast verifier**

Create `scripts/verify-contrast.mjs`:

```javascript
/**
 * Asserts every colour pairing the app renders against WCAG AA.
 * Reads src/design/tokens.ts so it can never drift from shipped values.
 * Exits non-zero on any failure. Wired into `npm run verify`.
 */
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

register('tsx/esm', pathToFileURL('./'))
const { stone, forest, clay, success, warning, danger } = await import('../src/design/tokens.ts')

const channels = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
const luminance = h =>
  channels(h)
    .map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
    .reduce((acc, v, i) => acc + v * [0.2126, 0.7152, 0.0722][i], 0)
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const CANVAS = stone[50]
const SURFACE = '#FFFFFF'
const W = '#FFFFFF'

const PAIRINGS = [
  ['body        stone-900 on canvas',    stone[900],   CANVAS,       4.5],
  ['body        stone-900 on surface',   stone[900],   SURFACE,      4.5],
  ['secondary   stone-600 on canvas',    stone[600],   CANVAS,       4.5],
  ['tertiary    stone-500 on canvas',    stone[500],   CANVAS,       4.5],
  ['tertiary    stone-500 on surface',   stone[500],   SURFACE,      4.5],
  ['link        forest-700 on canvas',   forest[700],  CANVAS,       4.5],
  ['link        forest-700 on surface',  forest[700],  SURFACE,      4.5],
  ['button      white on forest-600',    W,            forest[600],  4.5],
  ['sale        white on clay-600',      W,            clay[600],    4.5],
  ['danger      white on danger-600',    W,            danger[600],  4.5],
  ['warning     white on warning-600',   W,            warning[600], 4.5],
  ['success     white on success-600',   W,            success[600], 4.5],
  ['focus ring  forest-600 vs canvas',   forest[600],  CANVAS,       3.0],
  ['focus ring  forest-600 vs surface',  forest[600],  SURFACE,      3.0],
  ['border      stone-400 vs canvas',    stone[400],   CANVAS,       3.0],
  ['border      stone-400 vs surface',   stone[400],   SURFACE,      3.0],
  ['badge       forest-900 on -100',     forest[900],  forest[100],  4.5],
  ['badge       clay-900 on -100',       clay[900],    clay[100],    4.5],
  ['badge       danger-900 on -100',     danger[900],  danger[100],  4.5],
  ['badge       warning-900 on -100',    warning[900], warning[100], 4.5],
  ['badge       success-900 on -100',    success[900], success[100], 4.5],
  ['ghost hover stone-700 on stone-100', stone[700],   stone[100],   4.5],
  ['selected    stone-900 on forest-50', stone[900],   forest[50],   4.5],
]

let failed = 0
console.log('  RATIO   MIN   RESULT  PAIRING')
for (const [name, fg, bg, min] of PAIRINGS) {
  const r = ratio(fg, bg)
  const ok = r >= min
  if (!ok) failed++
  console.log(`  ${r.toFixed(2).padStart(5)}  ${min.toFixed(1)}   ${ok ? 'PASS' : 'FAIL'}    ${name}`)
}
console.log(`\n  ${PAIRINGS.length - failed}/${PAIRINGS.length} pass`)
if (failed) {
  console.error(`\n  WCAG AA FAILURE: ${failed} pairing(s) below threshold.`)
  process.exit(1)
}
```

- [ ] **Step 9: Run the contrast gate**

Run: `npm run verify:contrast`
Expected: `23/23 pass`, exit code 0.

- [ ] **Step 10: Commit**

```bash
git add vitest.config.ts package.json package-lock.json src/design scripts
git commit -m "test: add vitest, colour tokens, and the WCAG contrast gate"
```

---

## Task 5: Add the motion token module

**Files:**
- Create: `src/design/motion.ts`
- Create: `src/design/motion.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: exports `duration` (ms numbers), `durationCss` (ms strings for Tailwind), `easing` (cubic-bezier strings), and `spring` (framer presets). Task 6 imports `durationCss` and `easing`; Phase 2 components import `spring`.

**Why:** today three systems hold timing values independently — Tailwind inline durations, 22 files of hand-typed framer values, and raw CSS from 0.2s to 3s. Tuning motion is impossible without touching all three.

- [ ] **Step 1: Write the failing test**

Create `src/design/motion.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { duration, durationCss, easing, spring } from './motion'

describe('motion tokens', () => {
  it('keeps pointer-responsive motion under 180ms', () => {
    expect(duration.instant).toBeLessThanOrEqual(180)
    expect(duration.fast).toBeLessThanOrEqual(180)
    expect(duration.base).toBeLessThanOrEqual(180)
  })

  it('exposes every duration to tailwind as a ms string', () => {
    for (const key of Object.keys(duration)) {
      expect(durationCss[key]).toBe(`${duration[key as keyof typeof duration]}ms`)
    }
  })

  it('defines easing curves as cubic-bezier or linear', () => {
    for (const value of Object.values(easing)) {
      expect(value).toMatch(/^(cubic-bezier\(|linear$)/)
    }
  })

  it('framer presets omit duration alongside spring physics', () => {
    // framer-motion silently ignores `duration` once stiffness/damping are
    // present. Modal and Toast pass both today and settle ~3x slower than intended.
    expect(spring.overlay).not.toHaveProperty('duration')
    expect(spring.panel).not.toHaveProperty('duration')
    expect(spring.overlay.type).toBe('spring')
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./motion"`.

- [ ] **Step 3: Write the module**

Create `src/design/motion.ts`:

```typescript
/**
 * Single source of truth for motion. tailwind.config.ts imports durationCss
 * and easing; framer-motion components import spring. CSS and JS therefore
 * animate on identical values.
 *
 * Rule: nothing that responds to a pointer exceeds 180ms.
 */

export const duration = {
  instant: 80,   // colour/opacity on hover, checkbox tick
  fast:    120,  // button and input state change, focus ring
  base:    180,  // dropdown/popover enter, tab indicator
  slow:    260,  // modal and toast enter, page crossfade
  slower:  400,  // sheet/drawer slide only
} as const

export const durationCss: Record<string, string> = Object.fromEntries(
  Object.entries(duration).map(([k, v]) => [k, `${v}ms`])
)

export const easing = {
  standard: 'cubic-bezier(0.2, 0, 0, 1)',    // decelerate — ~90% of UI
  exit:     'cubic-bezier(0.4, 0, 1, 1)',    // accelerate out, at 0.75x enter
  emphasis: 'cubic-bezier(0.2, 0, 0, 1.2)',  // slight overshoot, sparing
  linear:   'linear',                        // spinners only
} as const

/** framer-motion presets. Never pass `duration` alongside these. */
export const spring = {
  overlay: { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 },
  panel:   { type: 'spring', stiffness: 320, damping: 32, mass: 1.0 },
} as const

export const fade = { duration: duration.base / 1000, ease: easing.standard } as const

/** Entrance staggers are first-mount only and capped, so refinement never
 *  replays a cascade. Today `index * 0.05` replays 0.55s on every keystroke. */
export const staggerDelay = (index: number): number => Math.min(index, 6) * 0.024
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test`
Expected: PASS, 8 tests total across both files.

- [ ] **Step 5: Commit**

```bash
git add src/design/motion.ts src/design/motion.test.ts
git commit -m "feat: add motion tokens shared by tailwind and framer-motion"
```

---

## Task 6: Rewrite the Tailwind token layer

**Files:**
- Modify: `tailwind.config.ts` (full rewrite)

**Interfaces:**
- Consumes: `stone`, `forest`, `clay`, `success`, `warning`, `danger`, `semantic` from `src/design/tokens.ts`; `durationCss`, `easing` from `src/design/motion.ts`
- Produces: Tailwind utilities `text-display|h1|h2|h3|body-lg|body|ui|caption|overline`, `rounded-xs|sm|md|lg|xl`, `shadow-e0|e1|e2|e3|e4`, `z-dropdown|sticky|overlay|modal|popover|toast|tooltip`, `bg-canvas|surface`, `text-primary|secondary|tertiary`, `border-subtle|strong`, `font-sans|serif|mono`.

**Ordering note:** this task does **not** delete anything from `globals.css`. Retiring the `primary`/`accent` names happens in Task 7, after `.gradient-text` is rewritten — deleting the ramp first is a hard Tailwind compile error, because `globals.css:62` does `@apply … to-accent-500` and that class is on the logo at `Navbar.tsx:48`.

- [ ] **Step 1: Rewrite the config**

Replace the entire contents of `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'
import { stone, forest, clay, success, warning, danger, semantic } from './src/design/tokens'
import { durationCss, easing } from './src/design/motion'

const config: Config = {
  darkMode: 'class', // architecture only — no dark theme ships in this phase
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        stone, forest, clay, success, warning, danger,
        ...semantic,
        // Retained ONLY until Task 7 retires the last call sites.
        primary: forest,
        accent: clay,
      },
      fontFamily: {
        sans:  ['var(--font-sans)', ...defaultTheme.fontFamily.sans],
        serif: ['var(--font-serif)', ...defaultTheme.fontFamily.serif],
        mono:  ['var(--font-mono)', ...defaultTheme.fontFamily.mono],
      },
      // Role-named, with leading/tracking/weight baked in so a heading
      // cannot ship untuned. Replaces 53 distinct heading class strings.
      fontSize: {
        display:  ['3.5rem',    { lineHeight: '1.05', letterSpacing: '-0.030em', fontWeight: '600' }],
        h1:       ['2.25rem',   { lineHeight: '1.15', letterSpacing: '-0.022em', fontWeight: '600' }],
        h2:       ['1.5rem',    { lineHeight: '1.25', letterSpacing: '-0.017em', fontWeight: '600' }],
        h3:       ['1.125rem',  { lineHeight: '1.40', letterSpacing: '-0.011em', fontWeight: '600' }],
        'body-lg':['1.0625rem', { lineHeight: '1.60', letterSpacing: '0em',      fontWeight: '400' }],
        body:     ['0.9375rem', { lineHeight: '1.55', letterSpacing: '0em',      fontWeight: '400' }],
        ui:       ['0.875rem',  { lineHeight: '1.45', letterSpacing: '0em',      fontWeight: '400' }],
        caption:  ['0.75rem',   { lineHeight: '1.40', letterSpacing: '0.005em',  fontWeight: '500' }],
        overline: ['0.6875rem', { lineHeight: '1.30', letterSpacing: '0.060em',  fontWeight: '600' }],
      },
      // Scaled to element size. The nesting is what reads as expensive.
      borderRadius: {
        xs: '0.25rem', sm: '0.375rem', md: '0.625rem', lg: '0.875rem', xl: '1.25rem',
      },
      maxWidth: {
        prose: '42rem', content: '72rem', wide: '80rem',
      },
      spacing: {
        'section-sm': '3rem', 'section-md': '5rem', 'section-lg': '7rem',
      },
      // Layered low-opacity shadow plus a hairline ring, in desaturated ink.
      // e0 is the Card default: hairline only, no shadow.
      boxShadow: {
        e0: '0 0 0 1px rgb(28 24 18 / 0.05)',
        e1: '0 1px 2px rgb(28 24 18 / 0.04), 0 0 0 1px rgb(28 24 18 / 0.05)',
        e2: '0 4px 8px -2px rgb(28 24 18 / 0.06), 0 2px 4px -2px rgb(28 24 18 / 0.04), 0 0 0 1px rgb(28 24 18 / 0.06)',
        e3: '0 16px 32px -8px rgb(28 24 18 / 0.12), 0 4px 8px -4px rgb(28 24 18 / 0.06), 0 0 0 1px rgb(28 24 18 / 0.06)',
        e4: '0 -4px 16px -4px rgb(28 24 18 / 0.08)',
      },
      zIndex: {
        dropdown: '100', sticky: '200', overlay: '300',
        modal: '400', popover: '500', toast: '600', tooltip: '700',
      },
      transitionDuration: durationCss,
      transitionTimingFunction: easing,
      keyframes: {
        // Named to avoid colliding with Tailwind's reserved spin/ping/pulse/bounce.
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'ring-pulse': {
          '0%':   { boxShadow: '0 0 0 0 rgb(184 68 47 / 0.7)' },
          '70%':  { boxShadow: '0 0 0 10px rgb(184 68 47 / 0)' },
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
```

- [ ] **Step 2: Verify the build still compiles**

Run: `npm run build`
Expected: `✓ Compiled successfully`. The app still renders with old class names because `primary` and `accent` are aliased.

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat: replace the decorative token layer with a real one"
```

---

## Task 7: Demolish the competing style system

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/ui/Button.tsx:9`
- Modify: `src/components/ui/Card.tsx`
- Modify: `src/app/page.tsx`, `src/app/(storefront)/products/page.tsx`, `src/app/admin/page.tsx` (remove `hover3D`)
- Modify: `tailwind.config.ts` (drop the compatibility aliases)

**Interfaces:**
- Consumes: the token layer from Task 6
- Produces: `Card` no longer accepts `hover3D`. Any later task passing it is a type error.

**Order matters.** Rewrite `.gradient-text` *before* removing the `accent` alias.

- [ ] **Step 1: Rewrite the two rules that depend on the retired ramps**

In `src/app/globals.css`, replace the `.gradient-text` rule (line ~61):

```css
  .gradient-text {
    @apply bg-gradient-to-r from-forest-700 to-forest-500 bg-clip-text text-transparent;
  }
```

In `src/components/ui/AdminAuth.tsx:77`, replace the wrapper class string:

```tsx
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200">
```

- [ ] **Step 2: Delete the dead and dangerous CSS**

In `src/app/globals.css`, delete these blocks entirely:

- The 3D card rules (`.card-3d`, `.card-3d-hover`) — they rotate the whole card frame, which destroys subpixel antialiasing on the text inside and clips images into the grid gutter.
- Everything from `/* Custom animations */` to the end of the file **except** `.loading-dots` and its `@keyframes loading-dot`. That range holds `.float-animation`, `.glow-animation`, `.product-card` (whose parent class is applied nowhere, so the intended homepage image zoom has never fired), `.cart-drawer-*`, `.toast-enter`/`.toast-exit` (which reference `slideUp`/`slideDown` keyframes Tailwind never emits), `.btn-hover-lift`, `.input-focus-glow`, `.badge-pulse`, and the bare `@keyframes pulse`.

**The `@keyframes pulse` deletion is the highest-value change in this task.** It sits outside any `@layer`, after `@tailwind utilities`, and overrides Tailwind's built-in — so every `.skeleton` and `animate-pulse` in the app currently renders an expanding red ring. The products page opens with twelve of them.

- [ ] **Step 3: Rescope the print rule**

Still in `globals.css`, inside the `@media print` block, replace the two selectors that blank the page. Today `body > div > div:not(.fixed) { display: none !important }` was never scoped to `/billing`, so all 12 legal and content pages print as a blank page with only the footer.

```css
    /* Scoped to the POS receipt only. Previously unscoped, which blanked
       every legal and content page on print. */
    [data-print="receipt-host"] > div:not(.fixed) {
      display: none !important;
    }
```

Then in `src/app/billing/page.tsx`, add the hook to the page's outermost `<div>`:

```tsx
    <div className="min-h-screen bg-gray-50" data-print="receipt-host">
```

- [ ] **Step 4: Remove the universal button lift**

`btn-hover-lift` is in the Button cva *base* string, so it fires on ghost, link and disabled buttons. In `src/components/ui/Button.tsx:9`, replace the base string:

```typescript
  'inline-flex items-center justify-center rounded-sm font-medium transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
```

- [ ] **Step 5: Remove the 3D card prop**

In `src/components/ui/Card.tsx`, delete `hover3D` from `CardProps`, from the destructured parameters, and from the `cn()` call. The remaining className logic becomes:

```tsx
        className={cn(
          'bg-surface rounded-md overflow-hidden transition-shadow duration-base ease-standard shadow-e0',
          !noPadding && 'p-6',
          className
        )}
```

Then remove the `hover3D` attribute from its call sites: `src/app/page.tsx:168`, `src/app/(storefront)/products/page.tsx:215`, `src/app/admin/page.tsx:515`.

- [ ] **Step 6: Retire the compatibility aliases**

In `tailwind.config.ts`, delete these two lines from `theme.extend.colors`:

```typescript
        primary: forest,
        accent: clay,
```

- [ ] **Step 7: Find every remaining reference to the retired names**

Run: `npx tsc --noEmit && npm run build`

The build will now fail on every file still using `primary-*`, `accent-*`, or `gray-*` in a way Tailwind cannot resolve via `@apply`. Raw class strings in JSX will *not* fail the build — they will silently render unstyled.

Run this to see the real scope:

```bash
grep -rn --include=*.tsx --include=*.ts -oE '\b(bg|text|border|ring|from|to|via)-(primary|accent|gray)-[0-9]+' src/ | wc -l
```

Expected: roughly 870 matches. **Do not migrate them in this task.** Record the number in the commit message as the Phase 2 baseline. The aliases are gone from the config, so these now fall back to Tailwind's stock `gray` (which still exists) or render unstyled for `primary`/`accent`.

**If the count of broken `primary-*`/`accent-*` references makes the app visually unusable for review, restore the two alias lines and defer their removal to the end of Phase 2.** Note that decision in the commit message. A green build with an unreviewable UI is not a shippable phase.

- [ ] **Step 8: Verify**

Run: `npm run verify`
Expected: typecheck clean, 8 tests pass, 23/23 contrast, build succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/app/globals.css src/components/ui/Button.tsx src/components/ui/Card.tsx src/components/ui/AdminAuth.tsx src/app/page.tsx "src/app/(storefront)/products/page.tsx" src/app/admin/page.tsx src/app/billing/page.tsx tailwind.config.ts
git commit -m "refactor: remove the competing globals.css style system

Deletes the bare @keyframes pulse that overrode Tailwind's built-in and
made every skeleton render a red ring. Rescopes the POS print rule, which
had been blanking all 12 legal and content pages. Removes the universal
button lift and the 3D card tilt that blurred type on hover."
```

---

## Task 8: Wire up fonts, reduced motion, and metadata

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/manifest.ts`
- Create: `src/app/icon.svg`

**Interfaces:**
- Consumes: nothing
- Produces: `--font-sans`, `--font-serif`, `--font-mono` on `<html>`; a `title.template` later pages fill via their own `metadata` export in Phase 4.

**Why fonts are a bug fix, not a feature:** `fontFamily.sans` names `Inter` literally while `layout.tsx` calls `Inter()` **without `variable`**, so next/font self-hosts under a generated family name and `font-sans` points at a font that never loads.

- [ ] **Step 1: Rewrite the root layout**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import { Inter, Fraunces, JetBrains_Mono } from 'next/font/google'
import { MotionConfig } from 'framer-motion'
import './globals.css'
import { ToastProvider } from '@/components/ui/Toast'

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const serif = Fraunces({ subsets: ['latin'], variable: '--font-serif', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })

export const metadata: Metadata = {
  title: {
    default: 'ModernStore — Furniture for considered spaces',
    template: '%s — ModernStore',
  },
  description:
    'Furniture built to last, photographed honestly, and priced without theatre.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-canvas font-sans text-body text-text-primary antialiased">
        <MotionConfig reducedMotion="user">
          <ToastProvider>{children}</ToastProvider>
        </MotionConfig>
      </body>
    </html>
  )
}
```

`MotionConfig reducedMotion="user"` covers every framer-motion animation in the app in one line. There are currently **zero** occurrences of `prefers-reduced-motion` anywhere.

- [ ] **Step 2: Add the CSS-level reduced-motion guard**

framer-motion is covered by `MotionConfig`, but raw CSS animations are not. In `src/app/globals.css`, inside `@layer base`, append:

```css
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
```

- [ ] **Step 3: Add the app icon**

Create `src/app/icon.svg`. Next.js picks this up by filename convention; no config needed. All 24 tabs currently show the default Next.js globe.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#2F5A3D"/>
  <path d="M8 21V13.5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1V21" stroke="#FAF9F6" stroke-width="2.2" stroke-linecap="round" fill="none"/>
  <path d="M6.5 21h19M10 21v2.5M22 21v2.5" stroke="#FAF9F6" stroke-width="2.2" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 4: Add the web manifest**

Create `src/app/manifest.ts`:

```typescript
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ModernStore',
    short_name: 'ModernStore',
    description: 'Furniture for considered spaces.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF9F6',
    theme_color: '#2F5A3D',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  }
}
```

- [ ] **Step 5: Verify**

Run: `npm run verify`
Expected: all four gates pass.

Then run `npm run dev` and confirm in the browser: the tab shows the green icon, headings render in Fraunces, body in Inter, and the page background is warm off-white rather than cool grey.

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx src/app/manifest.ts src/app/icon.svg src/app/globals.css
git commit -m "feat: wire up font variables, reduced-motion, and app identity"
```

---

## Task 9: Put the gate in CI

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: the `verify` script from Task 4
- Produces: nothing

**Why now:** the remaining phases rewrite ~870 colour call sites and restructure 24 routes. `tsc` alone is not a sufficient safety net, and scheduling the tooling after the refactor it was meant to protect is the single largest unstated risk in the strategy.

- [ ] **Step 1: Add the workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - name: Type check
        run: npm run typecheck
      - name: Unit tests
        run: npm test
      - name: WCAG AA contrast gate
        run: npm run verify:contrast
      - name: Production build
        run: npm run build
```

- [ ] **Step 2: Verify locally first**

Run: `npm run verify`
Expected: exit code 0. CI runs exactly these four commands, so a local pass predicts a CI pass.

- [ ] **Step 3: Commit and push**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: gate on typecheck, tests, contrast, and build"
git push
```

- [ ] **Step 4: Confirm the run is green**

Run: `gh run watch`
Expected: all four steps pass.

---

## Self-Review

**Spec coverage.** Phase 0 → Tasks 1–3, including the Suspense boundaries the original strategy missed. Phase 0.5 → Tasks 4 and 9; the axe smoke test is deliberately deferred to the Phase 2 plan, because there are no shells or landmarks to assert against until Phase 3 and an axe suite written now would encode the broken structure. Phase 1 → Tasks 5–8. Spec items intentionally **not** in this plan and carried forward: the `<Money>` primitive and the currency/locale decision (Phase 2, blocked on that decision), the ~870 colour call-site migration (Phase 2), and `opengraph-image.png` (Phase 4, where per-page metadata lands).

**Placeholder scan.** No TBD or TODO. Task 7 Step 7 is a judgement call rather than a fixed instruction, but the decision criterion and the fallback are both stated explicitly, which is the honest way to write a step whose outcome depends on a count only measurable at execution time.

**Type consistency.** `stone`/`forest`/`clay`/`success`/`warning`/`danger`/`semantic` are defined in Task 4 and imported under those exact names in Tasks 6 and 7. `durationCss`/`easing` are defined in Task 5 and imported in Task 6. `Product.primary_image` is added in Task 1 and relied on from Phase 2 onward. `Card.hover3D` is removed in Task 7 and referenced nowhere afterward.

**Known risk carried into Phase 2.** Task 7 Step 6 retires the `primary`/`accent` aliases while ~870 raw literals still reference them. The build stays green because these are JSX class strings, not `@apply` directives, but the UI will look partly unstyled until Phase 2 migrates the call sites. The fallback is written into the step.
