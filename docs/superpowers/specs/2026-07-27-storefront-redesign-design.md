# Storefront Redesign — Design Spec

**Date:** 2026-07-27
**Scope:** Customer storefront (Phases 0–6). Admin and POS get a separate spec.
**Status:** Awaiting review

---

## 1. Context

ModernStore is a Next.js 14 App Router furniture e-commerce app with three surfaces (storefront, admin, POS) over one SQLite database. This spec covers the storefront only.

An eight-part parallel audit produced **209 findings** which reduce to seven root causes. A skeptical review pass then found 13 coverage gaps and 10 risky recommendations in the original strategy; those corrections are folded in below.

### The seven root causes

1. **No app shell.** One `layout.tsx` serves 24 routes. Every page hand-pastes its own chrome. Six pages render no navigation at all — including the product detail page, the highest-intent page in the store. This single missing abstraction generates ~25 findings.
2. **The token layer is decorative.** `tailwind.config.ts` defines tokens nothing consumes (11 of 12 animations dead, both `glow` shadows dead, `accent` used twice) while real decisions live as **680 raw `gray-*`** and **187 raw `primary-*`** literals. No `fontSize`, `borderRadius`, `zIndex`, or `spacing` tokens exist. Result: 53 distinct heading class strings across 3 semantic levels, 13 `max-w-*` values, 7 elements at `z-50`.
3. **`globals.css` is a competing style system.** 146 lines sit outside any `@layer`, so Tailwind cannot purge them. `@keyframes pulse` at line 307 overrides Tailwind's built-in, so every skeleton renders an expanding **red** ring. The POS print rule was never scoped to `/billing`, so all 12 legal and content pages print blank.
4. **Primitives are sound but broken or bypassed.** `cn()`, cva, and `forwardRef` are correct. But Checkbox's tick never renders (`peer-checked:` without `peer`), ImageUpload imports a non-existent export, Modal's overlay click is inert, Spinner nests `animate-spin` inside `animate-spin`.
5. **Accessibility was never in the loop.** Across ~8,500 LOC: 9 `aria-label`, **0** `role=`, **0** `<main>`, **0** `focus-visible:`, **0** `prefers-reduced-motion`. `/accessibility` publishes a WCAG 2.1 AA conformance claim the app does not meet.
6. **All 24 pages are `'use client'`.** One metadata export exists, so all 24 tabs share a title. Content pages SSR at `opacity: 0` and stay invisible until hydration. The header fetches its own links, so it paints empty on every navigation.
7. **Motion is decoration, not feedback.** Three timing systems with no shared values. The product grid's 0.55s stagger replays on every search keystroke. Modal and Toast pass `duration` alongside spring physics, which framer ignores — they settle in ~0.8–1s, 3× the intent.

---

## 2. Design Direction

This is a **furniture store**. That determines everything below.

Furniture is bought with the eyes and justified with the hands. The product photography is the product. Every UI decision serves one goal: **let the photography speak, and get out of its way.**

Concretely:

- **Warm neutrals, not cool grays.** The UI base must harmonise with oak, walnut, linen, brass and plaster. A cool gray UI makes warm product photography look dirty.
- **A brand accent that separates from the merchandise.** Furniture photography is full of browns, tans, terracotta and cream. A warm accent would dissolve into it. Deep evergreen stays legible against warm imagery while reading as natural and premium.
- **Portrait imagery.** Furniture reads better tall than square. Product cards use 4:5.
- **Editorial typography.** A serif display face for headings against a neutral sans for UI — the pairing that reads as considered rather than templated.
- **Depth applied to imagery, not chrome.** Perspective and scale belong on the product photo inside its frame, never on the card frame itself.

### Reference philosophy

Article, Burrow, Floyd, Herman Miller, HAY — for restraint, warmth and photography-forward layout. Stripe and Linear — for interaction quality, focus states and motion discipline. Not copied; adopted.

---

## 3. Design System

### 3.1 Color

Two ramps plus three semantic roles. **All pairings verified by computation — 23/23 pass WCAG AA.**

#### Stone — warm neutral (the entire UI base)

| Token | Hex | Role |
|---|---|---|
| `stone-50` | `#FAF9F6` | canvas (page background) |
| `stone-100` | `#F3F1EC` | subtle surface, ghost hover |
| `stone-200` | `#E7E3DA` | hairline border (`border-subtle`) |
| `stone-300` | `#D4CEC1` | dividers |
| `stone-400` | `#948A76` | strong border (`border-strong`) |
| `stone-500` | `#7B7263` | tertiary text, placeholder |
| `stone-600` | `#615949` | secondary text |
| `stone-700` | `#4A4336` | — |
| `stone-800` | `#332E25` | — |
| `stone-900` | `#221F19` | primary text |
| `stone-950` | `#14120E` | — |

Steps 50–300 are decorative surfaces only. **400 is the lightest step permitted to carry meaning**, because 3:1 is the WCAG 1.4.11 floor for UI component boundaries. This discontinuity is designed, not accidental.

#### Forest — brand (deep evergreen)

| Token | Hex | Role |
|---|---|---|
| `forest-50` | `#F1F6F1` | selected row |
| `forest-100` | `#DEEADE` | badge background |
| `forest-200` | `#BDD4BF` | — |
| `forest-300` | `#93B698` | — |
| `forest-400` | `#639172` | — |
| `forest-500` | `#42714F` | — |
| `forest-600` | `#2F5A3D` | **primary button, focus ring** |
| `forest-700` | `#254832` | **link text** |
| `forest-800` | `#1E3928` | — |
| `forest-900` | `#182E20` | badge text |
| `forest-950` | `#0C1A12` | — |

#### Clay — secondary accent

`clay-50 #FDF5F1` · `clay-100 #F9E7DE` · `clay-200 #F0CBB9` · `clay-600 #A64E2C` · `clay-700 #873E22` · `clay-900 #4E2414`

**Used only for markdowns and sale tags.** Because clay appears nowhere else, a discounted price is instantly recognisable without a label.

#### Semantic

`success-600 #2F7D4A` · `warning-600 #9C5F00` · `danger-600 #B8442F`, each with 50/100/900 steps for badges.

`accent` and `info` from the current config are **deleted**. Informational states use neutral surfaces so the brand hue stays reserved for interactive affordances.

#### Verified contrast

| Pairing | Ratio | Min | |
|---|---:|---:|---|
| body `stone-900` on canvas | 15.61 | 4.5 | ✓ |
| secondary `stone-600` on canvas | 6.58 | 4.5 | ✓ |
| tertiary `stone-500` on canvas | 4.50 | 4.5 | ✓ |
| link `forest-700` on canvas | 9.72 | 4.5 | ✓ |
| white on `forest-600` | 7.92 | 4.5 | ✓ |
| white on `clay-600` | 5.60 | 4.5 | ✓ |
| white on `danger-600` | 5.38 | 4.5 | ✓ |
| white on `warning-600` | 5.18 | 4.5 | ✓ |
| white on `success-600` | 5.06 | 4.5 | ✓ |
| focus ring `forest-600` vs canvas | 7.52 | 3.0 | ✓ |
| border `stone-400` vs canvas | 3.24 | 3.0 | ✓ |
| all five badge pairings | ≥10.03 | 4.5 | ✓ |

Three values that **fail today** and are structural, not incidental: link text (4.09:1), the universal focus ring (2.81:1), and the warning button (1.90:1).

#### Restraint rule

The brand hue appears on exactly three things: **the primary button, the focus ring, and the active nav / selected row indicator.** Price is `stone-900`, never forest — colouring the base price spends the accent on information and leaves no headroom to signal a markdown. Current `primary-*` usage of 187 must fall to roughly 40.

#### Semantic indirection

Ramps are defined as CSS custom properties on `:root`; Tailwind consumes **semantic aliases**: `canvas`, `surface`, `surface-subtle`, `border-subtle`, `border-strong`, `text-primary`, `text-secondary`, `text-tertiary`, `ring`, `scrim`. Components use `bg-surface` and `text-secondary`, never `stone-600`.

Set `darkMode: 'class'` in Phase 1 but **ship no dark theme.** The indirection is far cheaper to establish during a migration already rewriting 680 call sites than to retrofit later. Honest cost: every rewritten call site must be authored against a semantic role, which is a real cognitive tax, and the result is partially-dark-ready components nobody can test until a theme exists. Dark mode is *not* "basically done" after this.

### 3.2 Typography

#### Fonts

A live bug is fixed here: `fontFamily.sans` is the literal `['Inter', ...]` while `layout.tsx` calls `Inter()` **without `variable`**, so next/font self-hosts under a generated name and `font-sans` points at a font that never loads.

```
Inter          → --font-sans   (UI, body)   variable, display:swap
Fraunces       → --font-serif  (display)    optical sizing, for headings
JetBrains Mono → --font-mono   (SKUs, IDs, receipts)
```

Fraunces is chosen for its optical-size axis and slightly editorial character — warm without being decorative. Applied to `display`, `h1`, `h2` only; `h3` and below stay Inter so UI density is unaffected.

On `html`, in `@layer base`: `font-feature-settings: 'cv11' 1, 'ss01' 1`.

#### Scale

Role-named, with lineHeight, letterSpacing and weight baked into each token so a heading cannot ship untuned. Replaces 53 distinct heading class strings.

| Token | Size | Leading | Tracking | Weight | Face | Use |
|---|---|---|---|---|---|---|
| `display` | 3.5rem | 1.05 | −0.030em | 600 | serif | hero only (clamps to 2.5rem below `sm`) |
| `h1` | 2.25rem | 1.15 | −0.022em | 600 | serif | page titles |
| `h2` | 1.5rem | 1.25 | −0.017em | 600 | serif | section headings |
| `h3` | 1.125rem | 1.40 | −0.011em | 600 | sans | card titles |
| `body-lg` | 1.0625rem | 1.60 | 0 | 400 | sans | marketing + legal prose |
| `body` | 0.9375rem | 1.55 | 0 | 400 | sans | app default |
| `ui` | 0.875rem | 1.45 | 0 | 400 | sans | dense surfaces |
| `caption` | 0.75rem | 1.40 | 0.005em | 500 | sans | table headers, metadata |
| `overline` | 0.6875rem | 1.30 | 0.060em | 600 | sans | eyebrows, sparing |

Negative tracking at display sizes is the highest-yield typographic change available: the codebase currently has **0** uses of `tracking-tight` and 55 uses of `leading-relaxed` (1.625) applied uniformly, including to 36–60px headings that want 1.05–1.15.

#### Weights

Every one of 324 current weight declarations is ≥500; `font-normal` has zero uses. New policy: **400** body copy, used explicitly; **500** UI labels and nav; **600** all headings; **700** reserved for one thing only. Dropping headings from 700 to 600 while adding negative tracking is what reads as premium at scale.

#### Numerics

`tabular-nums slashed-zero` via a `<Money>` / `<Numeric>` primitive. Zero uses today. All currency columns right-aligned. SKUs and order IDs in mono at `caption`.

**Open decision:** `formatCurrency` currently ignores its `currency` argument and concatenates a symbol with `toFixed(2)`, producing `$1234.56` with no grouping — while `calculateTax` defaults to 18%. The `$`/18% pairing is incoherent. **Decide the currency and locale model before building `<Money>`**, because switching to `Intl.NumberFormat` changes rendered output on printed receipts and the revenue CSV, which are archival artifacts.

#### Measure

Legal and editorial pages run ~110 characters per line inside `max-w-4xl`. Cap at **68ch (42rem)**.

### 3.3 Spacing, Radius, Elevation

**Grid:** 4px base. Tailwind's default spacing scale is kept — it is already a 4px grid and is not the source of drift. The drift is in *composition*, so the fix is named composite tokens.

**Containers** (replacing 13 distinct `max-w-*` values and 14 verbatim copies of the shell string):

```
prose    42rem   legal, editorial (~68ch)
content  72rem   default storefront
wide     80rem   grids, galleries
```

One gutter everywhere: `px-5 sm:px-6 lg:px-8`.

**Section rhythm** — three values, chosen from a set, never invented: `section-sm` 3rem · `section-md` 5rem · `section-lg` 7rem.

**Radius** — scaled to element size. This nesting is what produces the soft, expensive look. Currently Card, Modal and a small Button all use `rounded-lg` (8px), and `rounded-xl`+ has **zero** uses.

```
xs   4px    badges, chips
sm   6px    inputs, buttons
md   10px   cards, dropdowns
lg   14px   modals, sheets
xl   20px   hero panels, feature imagery
full        avatars, pills, icon buttons
```

**Control sizing** — one shared union across Button/Input/Select/Checkbox. Today Button md ≈34px, Select md ≈34px with different padding, and Input ≈42px because it sets no text size. They cannot align.

```
sm  h-8   px-3    text-ui
md  h-9   px-3.5  text-ui     ← default; one identical box everywhere
lg  h-11  px-4    text-body   ← mobile, primary CTAs
```

**Touch targets:** 44×44px minimum, enforced by an `<IconButton>` primitive using `min-h-11 min-w-11` with a `h-4 w-4` icon — visual weight unchanged, hit area tripled.

**Elevation** — 4 steps, each a layered low-opacity shadow plus a hairline ring, in desaturated ink (`28 24 18`), never pure black. Today `shadow-md` is the resting state of every surface, so depth encodes nothing.

```
e0  0 0 0 1px rgb(28 24 18 / .05)                                       flat + hairline — Card DEFAULT
e1  0 1px 2px rgb(28 24 18 / .04), 0 0 0 1px rgb(28 24 18 / .05)        raised card, scrolled navbar
e2  0 4px 8px -2px rgb(28 24 18 / .06), …, 0 0 0 1px …/.06              dropdown, popover
e3  0 16px 32px -8px rgb(28 24 18 / .12), …                             modal, sheet
e4  0 -4px 16px -4px rgb(28 24 18 / .08)                                upward — sticky mobile buy bar
```

Card defaults to **e0**; elevation is opt-in via `variant="elevated"`, and hover elevation only when `interactive` is set. This kills the false affordance on static legal-copy and order-summary cards.

**Soft-surface treatment (in place of neumorphism).** The brief requested neumorphism. Neumorphism is *definitionally* a WCAG 1.4.11 failure — same-hue extruded shadows cannot reach 3:1 against their own surface — and it erases pressed/disabled distinction. Since the brief also requires WCAG AA, the two requirements are mutually exclusive. Resolution: **soft elevated surfaces** — `stone-50` fill, generous radius, a dual inner/outer shadow for tactility, and a real `stone-200` hairline that carries the boundary. Visually ~90% of the intent, contrast-safe.

**Scrim:** `rgb(28 24 18 / .32)` + `backdrop-blur-[2px]` as a `colors.scrim` token, replacing `bg-black bg-opacity-50`. All four legacy `bg-opacity-*` sites convert to slash syntax (the legacy utility is removed in Tailwind v4 and `tailwind-merge` cannot dedupe it).

**Z-index** — named scale replacing 7 elements all at `z-50`, three of which share the bottom-right corner:

```
base 0 · dropdown 100 · sticky 200 · overlay 300 · modal 400 · popover 500 · toast 600 · tooltip 700
```

Policy: toasts own bottom-right exclusively; ScrollToTop moves into the shell.

### 3.4 Motion and Depth

**One source of truth.** `src/lib/motion.ts` exports the values as TS constants; `tailwind.config.ts` imports the same object into `transitionDuration` and `transitionTimingFunction`. Framer and CSS therefore share literal values — impossible under today's three-system split.

**Durations:** `instant` 80ms · `fast` 120ms · `base` 180ms · `slow` 260ms · `slower` 400ms.
Rule: nothing that responds to a pointer exceeds 180ms.

**Easing:** `standard` `cubic-bezier(.2,0,0,1)` (~90% of UI) · `exit` `cubic-bezier(.4,0,1,1)` at 0.75× enter · `emphasis` `cubic-bezier(.2,0,0,1.2)` sparing · `linear` for spinners only.

**Framer presets** (fixing a live bug — Modal.tsx:77 and Toast.tsx:93 both pass `duration` alongside spring params, which framer ignores, giving ~0.8–1s settles):

```
overlay  { type:'spring', stiffness:420, damping:34, mass:.9 }   ~230ms
panel    { type:'spring', stiffness:320, damping:32, mass:1 }    sheets
fade     { duration:.18, ease: standard }
```

#### Depth policy — 3D done correctly

The current `.card-3d-hover` rotates the **entire card frame** 5°, which destroys subpixel antialiasing on the text inside (blurred type) and clips the image into the grid gutter. It is deleted. Depth is re-applied where it works:

1. **Product cards** — the *image* scales to 1.04 with a subtle `translateZ` inside its own `overflow-hidden` frame. The card and its type stay perfectly still and sharp.
2. **Hero** — the hero is a carousel (§3.5) whose *active slide* carries layered assets with mouse-tracked parallax, clamped to ±8px, desktop pointer only. Parallax is bound to the active slide and torn down on slide change, so it never runs on off-screen slides.
3. **Scroll depth** — sections rise on entry (`translateY` 16px + fade), `whileInView` with `once: true`.
4. **Gallery** — pinch/scroll zoom on the PDP image, in a contained lightbox.

**Rule: hover changes colour and imagery, never the geometry of text-bearing containers.**

`btn-hover-lift` is deleted from the Button cva base (it currently fires on ghost, link and *disabled* buttons). `disabled:pointer-events-none` is added.

**Glassmorphism** is used in exactly one place — the sticky navbar, over a backdrop the shell controls — with a solid fallback layer beneath guaranteeing text contrast. It is not used over arbitrary content, because that makes contrast non-deterministic and voids the verified AA pairings.

**3D product rotation** is deferred. It requires multi-angle capture per product; the repository contains **one** uploaded product image and no asset pipeline. The `<ProductViewer360>` component is built behind a feature flag and activated when assets exist.

**Parallax** is limited to the hero. It is not applied to the 12 long legal pages, where scroll-linked transform conflicts directly with the reduced-motion mandate and slows reading.

#### Stagger and reveal

- Staggers are first-mount only and capped: `delay: min(index, 6) × 24ms` (max 144ms). Today `index × 0.05` replays a 0.55s cascade on every debounced keystroke, sort and page change; the categories page at `index × 0.1` reaches 1.2s.
- Grid refinement is a **120ms crossfade at `opacity-60`**, never a teardown to skeletons. Skeletons are for cold load only.
- Entrance animation is removed entirely from static content pages, where it currently delays content by up to 800ms and finishes off-screen.

#### Reduced motion — ships in Phase 1, non-negotiable

Currently **0** occurrences app-wide, while `.badge-pulse` runs an infinite red pulse on every out-of-stock item.

1. `<MotionConfig reducedMotion="user">` at the root — covers all framer motion in one line.
2. In `@layer base`: a `@media (prefers-reduced-motion: reduce)` block forcing `animation-duration: .01ms`, `animation-iteration-count: 1`, `transition-duration: .01ms`, `scroll-behavior: auto`.
3. Explicitly neutralise remaining hover transforms and all carousel autoplay.

Opacity and colour transitions may remain; transforms, parallax and looping motion are what trigger vestibular symptoms.

### 3.5 Carousel — accessibility contract

Four carousels ship: **hero**, **featured products**, **category showcase**, **testimonials**. All share one primitive with a mandatory contract:

- `role="region"` + `aria-roledescription="carousel"` + an accessible name.
- Slides `aria-roledescription="slide"` with `aria-label="3 of 7"`.
- **A visible pause/play control whenever autoplay is on.** WCAG 2.2.2 requires a pause mechanism for any motion lasting over 5 seconds — this is not optional.
- Autoplay stops permanently on any user interaction, and never starts when `prefers-reduced-motion` is set.
- Keyboard: arrow keys move slides, `Tab` reaches every interactive element in the visible slide, off-screen slides are `inert`.
- Native CSS scroll-snap as the transport, so touch and trackpad behave natively and it degrades without JS.
- Progress indicators are real buttons with `aria-current`, not dots in a `<div>`.

---

## 4. New Primitives

Scoped to what Phases 1–6 actually consume. Radix is introduced only where hand-rolling the accessibility would be irresponsible (Dialog, Tabs, Accordion, Slot) — four packages, budgeted.

**Layout:** `Container` · `PageHeader` · `Section` · `Prose` · `StorefrontShell` · `AppFrame` (skip link + `<main id="content">`)

**Forms:** `FormField` (`useId`, `htmlFor`, `aria-invalid`, `aria-describedby` wired once — the single highest-leverage a11y primitive) · `Textarea`

**Feedback:** `EmptyState` · `ErrorState` · `Skeleton` (shimmer) · upgraded `Toast` (`aria-live`, pause on hover, stack cap 3, `action` slot for Undo) · `ConfirmDialog` (replacing 5 native `confirm()`)

**Commerce:** `ProductCard` (one component shared by home, listing, categories, favorites, with a `loading` variant) · `ProductGallery` · `Money` · `PriceBlock` · `StickyBuyBar`

**Navigation:** `Carousel` · `Pagination` (windowed) · `Breadcrumb` (the PDP's existing implementation is good — extract verbatim) · `Tabs` · `Accordion`

**Controls:** `IconButton` (required `label` prop → `aria-label`, 44px min) · `Logo`

**Motion:** `Reveal` · `Tilt` · `Parallax` · `AnimatedCounter` — all reduced-motion aware by construction.

---

## 5. Phases

Each phase is independently shippable and verifiable.

### Phase 0 — Unbreak the build · S

`npm run build` currently fails. Without a green build there is no regression gate for anything that follows.

- Add `primary_image?: string` to `src/types/product.ts` — one line clears 5 of 23 errors across 4 files.
- Delete the phantom `import { Button }` at `ImageUpload.tsx:5`.
- Fix `admin/page.tsx:567` (form reset omits `image_url` — also a real bug: "Add Product" after editing carries the previous image).
- Move `noPadding` from `<CardContent>` to `<Card>` at `admin/revenue/page.tsx:374`.
- **Wrap `order/success/page.tsx` and `order/cancel/page.tsx` in `<Suspense>`.** Both call `useSearchParams()` with no boundary — a hard Next 14 build failure currently masked by type-checking failing first. Without this the build stays red.
- Clear the remaining API-route type errors.
- **Excluded:** the `stripe.ts` apiVersion bump. Moving `2024-11-20.acacia` → `2025-10-29.clover` is a live payment-behaviour change, not a type fix, in a repo with no tests. It belongs to a payments task with its own verification.

### Phase 0.5 — Thin verification gate · S

Refactoring 8,269 LOC with `tsc` as the only safety net is the largest unstated risk in this plan. A minimal gate ships *before* the refactor, not after.

- `tsc --noEmit` and `next build` as blocking CI checks.
- axe-core smoke test on 5 representative routes.
- The contrast assertion suite over the token pairings. A working verifier was written during this audit and lives in the session scratchpad; it must be moved into the repo (`scripts/verify-contrast.mjs`) and wired to the real token file so it asserts against the shipped values rather than a copy.

### Phase 1 — Tokens and globals demolition · M

Ships real visible wins with zero page migration.

- Rewrite `tailwind.config.ts`: stone + forest + clay ramps, 3 semantic ramps, role-named `fontSize`, `borderRadius`, `zIndex`, 4-step elevation, duration and easing tokens, `colors.scrim`. Map semantic aliases as CSS variables. Set `darkMode: 'class'`.
- **Rewrite `.gradient-text` before deleting `accent`.** `globals.css:62` does `@apply … to-accent-500` and the class is on the logo at `Navbar.tsx:48`; deleting the ramp first is a hard compile error. Same for `AdminAuth.tsx:77`.
- **Rename `@keyframes pulse` → `ring-pulse`.** One word; stops every skeleton in the app from rendering a red alarm ring.
- **Rescope the POS print rule to `/billing`.** Restores printing on all 12 legal and content pages.
- Delete globals.css 172–317 (dead `.float-animation`, `.glow-animation`, `.cart-drawer-*`, `.toast-enter/exit` pointing at keyframes Tailwind never emits, `.product-card` whose parent class is applied nowhere).
- Remove `btn-hover-lift` from the Button base; remove `hover3D`/`card-3d` and its 4 call sites.
- Fix next/font: add `variable`, add Fraunces and JetBrains Mono, point `fontFamily` at the CSS variables.
- Add the reduced-motion block and `<MotionConfig reducedMotion="user">`.
- Create `src/lib/motion.ts` and import it into the Tailwind config.
- **Add favicon, apple-icon, opengraph-image and manifest.** None exist; all 24 tabs show the default Next.js globe and every shared link renders a blank card.

### Phase 2 — Primitives, a11y core, motion components · L

- **Modal:** `role="dialog"`, `aria-modal`, focus trap, initial focus via the already-declared-but-unused `modalRef`, focus restore, portal. Fix `closeOnOverlayClick` (handler moves to the line-70 wrapper with an `e.target === e.currentTarget` guard). Base on `@radix-ui/react-dialog`.
- **FormField** extraction; Input/Select/Checkbox/Textarea inherit it. Add `peer` to the Checkbox input so the tick renders.
- **Button:** delete the lift, add `asChild` via Radix Slot (ends button-nested-in-anchor at 7 sites), `gap-2`, `disabled:pointer-events-none`, `aria-busy`, fix the warning variant.
- **Toast:** `aria-live`, labelled dismiss, pause on hover/focus, stack cap 3, `action` slot.
- **Card:** cva rewrite with `variant`, `padding` (replacing the negative `noPadding` boolean), explicit `interactive`.
- **Spinner:** remove the nested `animate-spin`; make it the single implementation, replacing 4 hand-rolled spinners.
- Global sweep: 17 `focus:ring` → `focus-visible:`, one ring token, `ringOffsetColor` set to canvas. **Keep `focus:` on programmatically-focused targets** — pairing this with Modal's new `initialFocus` can otherwise leave a dialog with no visible ring.
- Build `Carousel`, `Reveal`, `Tilt`, `Parallax`, `AnimatedCounter`, `IconButton`, `EmptyState`, `ErrorState`, `Money`, `Skeleton`, `ConfirmDialog`.
- Standardise exports; add `src/components/ui/index.ts`.

### Phase 3 — App shell · L

The highest-leverage structural change: resolves ~25 findings and deletes ~30 call sites.

- **Move `src/app/page.tsx` into `src/app/(storefront)/`.** Route groups do not affect the URL, and without this the homepage — the highest-traffic route — is the one page still hand-pasting chrome after the phase whose purpose was to end it.
- Create `(storefront)/layout.tsx`: skip link, `StorefrontShell` (Navbar + `<main id="content">` + Footer), one canvas, one Container. Delete all 18 Navbar and 12 Footer imports.
- **Move the nav fetch server-side** into the layout, passing items to a thin client Navbar — kills the empty-header flash. Include a fallback nav for the empty-table case, so a fresh install does not render a header with zero links.
- Navbar: hairline at rest → e1 on scroll, glass treatment, active route via `usePathname`, `aria-expanded`/`aria-controls` + Escape + focus trap + scroll lock on the mobile menu, count badges as `min-w-5` pills with a 99+ clamp, **a real search input** (currently absent from the header entirely).
- Apply the z-index scale; resolve the bottom-right collision; extract ScrollToTop from `<footer>`.
- Delete the duplicated Navbar/Footer in Suspense fallbacks (they cause remount + refetch).

### Phase 4 — Server components, metadata, content pages · M

- Convert the 12 static pages to server components; delete the framer entrance cascades. Only the FAQ accordion and contact form remain client islands.
- Per-page `metadata` + a `title.template` of `'%s — ModernStore'`.
- Adopt `Prose` at 68ch, `PageHeader`, `Section` across all 12.
- Convert 7 raw `<a>` internal links to `next/link`; drive legal documents from a structured array with anchor ids and a sticky ToC.
- Fix `Last updated: {new Date()}` on 5 legal pages (renders today's date on every load and causes a locale hydration mismatch).
- Add `not-found.tsx`, `error.tsx`, `global-error.tsx`. None exist; a bad URL currently drops the user on Next's unstyled default with no brand.
- **Reconcile `/accessibility` with reality** — either meet the published WCAG 2.1 AA claim or rewrite it as a known-issues statement.

### Phase 5 — Commerce funnel · XL

The money path. The first phase that is genuinely a redesign.

- **`ProductCard`** shared across home, listing, categories, favorites: whole-card stretched link (**the product name is currently not clickable — only the image**), one 4:5 aspect token instead of `h-48` vs `h-64`, `next/image` with `sizes`, image-level hover scale, badge suppressed for healthy stock, price in `stone-900` with clay reserved for markdown.
- **Add `remotePatterns` to `next.config.js`** before the `next/image` migration — `images.domains: ['localhost']` is deprecated and any externally-hosted product image will hard-fail.
- **Grid:** windowed `Pagination`, real `EmptyState` with query echo and "Clear all filters", filter bar with result count and active-filter chips, crossfade refinement, **sort resets to page 1** (changing sort on page 5 currently refetches page 5 of the new ordering and can strand the user on an empty page), all state in URL params.
- **PDP:** sticky buy panel on desktop, sticky bottom bar on mobile, gallery lightbox with zoom and swipe, **Favorite and Share moved outside the `inStock` guard** (an out-of-stock page is currently a total dead end), notify-me capture, quantity as a real numeric input, `aria-label` on icon-only actions, `<ProductViewer360>` behind a flag.
- **Cart:** destructure `isLoading` so the page stops flashing "Your cart is empty" on every load; a real `<form>` with `autoComplete` tokens and a split address; field-level errors; trust signals and linked Terms/Returns under the CTA; two-row mobile line item; 44px targets; Undo instead of one-click Clear Cart; delivery estimate.
- **Order outcomes:** itemised success page echoing the shipping address; cancel page's primary action becomes "Resume payment". Note the real abandonment path is worse than the cancel page: `clearCart()` fires at `cart/page.tsx:96` *before* the Stripe redirect, and there is no order-lookup page and no transactional email anywhere in the repo, so an abandoning customer has no way back. **Move `clearCart` to the success path** and log the recovery gap for the payments spec.
- Route every price through `Money` (6 hardcoded `$` sites bypass `formatCurrency` today).
- Add `loading.tsx`; replace both `return null` blank-page branches.
- Add carousels: hero, featured, category showcase, testimonials.

### Phase 6 — Verification and hardening · M

- Extend the Phase 0.5 gate: axe on every route, Lighthouse budgets, a lint rule banning raw `gray-*`/`primary-*` literals.
- Full keyboard walkthrough of checkout.
- Reduced-motion pass, 200% zoom pass, and a check that no route scrolls horizontally at 320px.
- **Wire `ErrorState` to the ~30 fetch call sites** that currently catch to `console.error` and leave a permanent skeleton. Building the primitive without budgeting the call-site migration repeats exactly the mistake this audit diagnoses in root cause 4.
- Document the system: a tokens page and component gallery.

---

## 6. Explicitly Out of Scope

- **Admin and POS.** Separate spec. Note `admin/revenue/transactions/page.tsx` is 599 LOC and must be included there.
- **Authentication.** `AdminAuth.tsx:13` hardcodes the password in a client component and no API route checks anything. **Do not restyle this screen.** Polishing it makes an unprotected system look protected — strictly worse than today's legible fakeness. It is blocked on real server-side auth.
- **Stripe API version bump** and the webhook signature gap.
- **Dark theme.** Architecture prepared, theme not built.
- **3D product rotation activation.** Component built, dormant until multi-angle assets exist.
- **Transactional email and order lookup.** Named as a gap; belongs to a commerce-backend spec.
- **POS cart persistence, the 100-product fetch ceiling, and the 12-tile Quick Add cap** — real money-losing defects, but POS scope.

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| No test infrastructure exists — zero test files, no runner | Phase 0.5 lands a thin gate before the refactor, not after |
| 680 colour call sites migrated by hand | Semantic aliases + a lint rule banning raw literals in Phase 6 |
| Deleting `accent` breaks the logo | `.gradient-text` rewritten first, in the same phase |
| `next/image` migration breaks external images | `remotePatterns` added before migration |
| Radix adds bundle weight | Limited to 4 packages, only where hand-rolling a11y is irresponsible |
| SQLite/better-sqlite3 cannot deploy serverless | Lighthouse budgets assume a long-lived Node host; noted, not solved here |

---

## 8. Success Criteria

- `npm run build` green; `tsc --noEmit` clean; both blocking in CI.
- axe-core reports zero violations on every storefront route.
- Every token pairing passes WCAG AA by automated assertion.
- Checkout completable by keyboard alone.
- No horizontal scroll at 320px; usable at 200% zoom.
- `prefers-reduced-motion` honoured on every animation, including carousel autoplay.
- Raw `gray-*` and `primary-*` literals reduced to zero, enforced by lint.
- Every route has its own title and a share image.
