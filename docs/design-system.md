# Vimco Furniture House design system

Everything visual comes from four files — storefront, admin and the
register alike. If a value is not
in one of them, it should not be in a component.

| File | Owns |
| --- | --- |
| `src/design/tokens.ts` | Colour. The only file allowed to state a colour value. |
| `src/design/typography.ts` | The type scale. |
| `src/design/motion.ts` | Duration, easing, spring, stagger. |
| `tailwind.config.ts` | Reads all three and generates the classes. |

Nothing is duplicated between them, deliberately. Each of the three has more
than one consumer, and every time a value has been restated by hand in this
codebase it has eventually drifted — see the notes at the bottom.

## Colour

Three ramps and a set of semantic aliases.

- **bark** — the neutral. Warm rather than grey, because a cold grey next to
  wood photography reads as blue.
- **caramel** — the accent. Buttons, links, focus rings, the active nav
  underline.
- **sage** — a secondary accent, used sparingly.
- **success / warning / danger** — state only.

Reach for the semantic alias, not the ramp number:

```tsx
<p className="text-text-secondary">…</p>   // yes
<p className="text-bark-600">…</p>          // works, but says less
```

`canvas`, `surface`, `surface-subtle`, `border-subtle`, `border-strong`,
`text-primary`, `text-secondary`, `text-tertiary`, `ring` and `scrim` all
resolve to ramp values. Using the alias means a future palette change is one
edit rather than a search.

**Every pairing the app renders is verified against WCAG AA.**
`npm run verify:contrast` reads `tokens.ts` directly — not a copy — and
asserts 4.5:1 for text and 3:1 for UI boundaries across 36 pairings.

## Type

Role-named, never size-named. Leading, tracking and weight are baked into
each entry so a heading cannot ship untuned.

| Class | Size | Use |
| --- | --- | --- |
| `text-display` | 56px | One per page at most, hero only |
| `text-h1` | 36px | Page title |
| `text-h2` | 24px | Section |
| `text-h3` | 18px | Card title, subsection |
| `text-body-lg` | 17px | Lead paragraph |
| `text-body` | 15px | Default prose |
| `text-ui` | 14px | Labels, controls, dense text |
| `text-caption` | 12px | Metadata |
| `text-overline` | 11px | Eyebrow, uppercase |

Do not add `leading-*`, `tracking-*` or `font-*` beside these. They are
already set, and overriding one of the three usually means the wrong role was
chosen.

Serif (`font-serif`) is for page and section titles. Everything else is sans.

## Space, radius, elevation

- **Sections** — `py-section-sm` (48px), `py-section-md` (80px),
  `py-section-lg` (112px). Not `py-12` picked at random.
- **Width** — `max-w-prose` (42rem) for reading, `max-w-content` (72rem) for
  the storefront, `max-w-wide` (80rem) for grids. Use `<Container>` rather
  than applying these directly.
- **Radius** scales with the element: `rounded-xs` badges, `rounded-sm`
  inputs and buttons, `rounded-md` cards, `rounded-lg` modals, `rounded-xl`
  hero panels. Nesting a smaller radius inside a larger one is what reads as
  considered.
- **Elevation** is `shadow-e0` through `shadow-e4`, layered low-opacity
  shadow plus a hairline ring, in desaturated ink rather than black. `e0` is
  the resting state of a card — a hairline, no shadow. If everything is
  raised, depth encodes nothing.
- **Stacking** is named, not numbered: `z-dropdown`, `z-sticky`, `z-overlay`,
  `z-modal`, `z-popover`, `z-toast`, `z-tooltip`.

## Depth

Three shadows beyond the flat scale, plus the helpers that use them.

| Token | For |
| --- | --- |
| `shadow-lift` | What a card rises to under the pointer |
| `shadow-float` | Hero panels and glass, clearly in front of the page |
| `shadow-well` | Inset. Inputs, pressed buttons, stepper and carousel tracks |
| `shadow-rim` | A warm inner highlight, for dark panels where a grey ring reads cold |

And four utilities in `globals.css`:

- **`.stage`** sets `perspective` on the parent. A rotation without it
  projects orthographically and reads as a skew rather than a tilt.
- **`.lift-on-hover`** raises a card 4px and swaps `shadow-e2` for
  `shadow-lift`. Transform and shadow only — never colour, so nothing inside
  it can drift out of contrast. It flattens under reduced motion.
- **`.glass-dark`** is the panel used over the dark hero. The blur is
  decoration; the **background alpha** is what keeps white text readable
  whatever scrolls behind it. Never rely on `backdrop-blur` alone for
  contrast — it makes the composited result depend on the photograph.
- **`.scrim-fade`** is the gradient that sits between a photograph and any
  text laid over it.

Two gradients are named rather than mixed inline, so the colour gate does not
have to allow arbitrary values through: `bg-grain-warm` (the hero wash),
`bg-sheen` (the highlight that sweeps a card on hover), `bg-fade-up` (what
`.scrim-fade` uses).

**`Tilt` goes on a media frame, never on a card containing text.** Rotating
type destroys subpixel antialiasing, and rotating a card pushes its corners
into the grid gutter. Inside a clipped frame it costs nothing. It disables
itself under reduced motion and on touch, where there is no hover to drive it.

**`Parallax` is for hero layers only.** Scroll-linked transform on a long
reading page fights the reader.

`shadow-well` is the one shadow that pushes *in* rather than up. It is what
makes a field read as somewhere to put something rather than a rectangle:
inputs and selects, the quantity steppers, a button's `:active` state — there
was none before, so on touch a press gave no feedback at all — and the
carousel's dot track.

`animate-ring-pulse` rings the cart badge when the count goes up, and runs
**twice, then stops**. It was `infinite`, which fails WCAG 2.2.2 the moment
anything blinks past five seconds with no way to pause it, and a badge that
pulses forever stops meaning "something just changed" by the second time you
look at it.

Run `npm run find-unused` to list tokens, utilities and components that exist
with no call site. Three motion components sat unused until somebody asked
where the animation had gone; the script exists so that list is visible rather
than discovered. It reports, it does not fail — a scale can legitimately hold
a step in reserve, and that judgement stays with a person.

## Motion

```
instant  80ms   colour on hover, checkbox tick
fast    120ms   button and input state, focus ring, row hover
base    180ms   dropdown and popover enter, tab indicator
slow    260ms   modal and toast enter, page crossfade
slower  400ms   sheet and drawer slide only
```

Nothing that responds to a pointer exceeds 180ms.

Easing comes in two forms from one source. `ease` is control points, for
framer-motion. `easing` is the `cubic-bezier(…)` string, for CSS and
Tailwind. **Pass the wrong one to framer and it does not fall back — it
refuses the animation and pins the element to its initial keyframe, so the
content sits at opacity 0.** That is not a hypothetical; it is why `Reveal`
rendered nothing the first time it was used.

Never pass `duration` alongside a `spring` preset. Framer ignores it once
physics parameters are present.

Entrance staggers cap at six items, 24ms apart. They are first-mount only —
filtering a grid uses a crossfade, so nobody waits out a cascade to read
results.

Reduced motion is handled by `MotionConfig` in `src/app/providers.tsx` (a
client component — mounting it from a server layout leaves everything at its
initial keyframe) plus a base rule in `globals.css`. Transforms and looping
motion go; opacity and colour transitions stay, since a fade is not what
triggers vestibular symptoms.

## Components

Import from the barrel:

```tsx
import { Button, Card, Modal, Money } from '@/components/ui'
```

Notes that are easy to get wrong:

- **`Button` with `asChild`** wraps a link without nesting a button inside an
  anchor: `<Button asChild><Link href="/x">Go</Link></Button>`. Icons are
  injected into the child, so `leftIcon` still works.
- **`Money`** formats every price. Never `toFixed(2)` with a currency symbol
  in the markup — the product page shipped `$168000.00` that way.
- **`ProductCard`** is the only product card. Home, listing, categories,
  related and favourites all use it; favourites adapts its flat localStorage
  shape through `toProduct`.
- **`ErrorState` and `EmptyState` are different things.** A failed request is
  not an empty shelf. `EmptyState` says there is nothing; `ErrorState` says
  we could not ask, and offers a retry.
- **`ConfirmDialog`** rather than `window.confirm`, except where an Undo
  toast is better — anything reversible in one tap should offer Undo instead.
- **`PrintDocument`** is how anything reaches a printer. It renders into a
  container appended to `<body>`, and one print rule hides every other
  top-level child. Never print by hiding the page around a thing: the
  previous receipt did that with selectors anchored to a wrapper, and the
  printed page came out as the POS header with no receipt on it at all.

## Gates

`npm run verify` runs all of them.

| Command | Asserts |
| --- | --- |
| `verify:contrast` | 36 colour pairings meet AA. Reads `tokens.ts` directly. |
| `verify:tokens` | No hex, `rgb()`, `hsl()`, Tailwind default palette or bracket colours anywhere outside the token file. Nothing is excluded. |
| `verify:a11y` | 144 checks over 24 routes, storefront and staff screens alike — the admin ones audited signed in, using a throwaway password the gate mints for the run: axe at two widths, reflow at 320px and 200% zoom, reduced motion, focus visibility. |
| `test` | 249 tests. Design system (tokens, motion, `cn`), cart arithmetic and stock caps, pricing and validation, the checkout gate rendered in jsdom, server-derived order pricing against a real Postgres schema the test creates and drops, the `?`-to-`$n` placeholder converter, currency conversion, sessions and password hashing, which routes middleware opens and shuts, phone-number normalisation, and the booking bill's WhatsApp message and link. |

`verify:a11y` needs a production build; `next dev` overwrites `.next`, so run
`npm run build` after any dev session.

Admin, POS and billing were held out while the storefront was refactored,
excluded by name with their literal count printed on every run so the debt
stayed visible. They have since been migrated and the exclusion list is
empty.

## Four bugs worth remembering

Each of these was invisible to type checking, to the build, and to review.
They are the reason the gates exist in the form they do.

**The primary button shipped at 3.49:1.** `tailwind-merge` decides whether
`text-` is a size or a colour by recognising the suffix. It knows `sm` and
`white`; it did not know `body`, `ui` or `h1`, so it filed them as colours,
put `text-white` and `text-body` in one conflict group, and dropped whichever
came first. `cva` emits the variant before the size, so the colour was always
first and always lost. The class was in the source and gone from the DOM.
Fixed by teaching `tailwind-merge` the scale in `src/lib/cn.ts`, from the
same object Tailwind generates from.

**Three breadcrumb links had no focus ring.** Every primitive had one, which
is exactly why it went unnoticed — the gap was only in hand-written anchors.
Fixed with a zero-specificity base rule so components still win. Note that
testing for "has an outline" would not have caught it: Tailwind's
`outline-none` sets a *transparent* outline rather than removing it. The gate
compares focused styles against blurred ones instead.

**An unnamed link was the only way out of the register.** The POS header's
exit carried an `ArrowLeft` marked `aria-hidden` beside a label set to
`hidden sm:inline`. Above the sm breakpoint it read fine. Below it, the
label was gone, the icon was hidden from assistive technology, and the link
announced as nothing at all. The same shape appeared four more times in the
admin nav. Icon-plus-hidden-label needs an `aria-label`, matching the
visible text so voice control still works when the text does show.

**Two hex values had drifted.** The share card painted `#FAF8F5` where the
app paints `#FAF9F6`, and `#94897A` where bark-400 is `#948A76` — both
hand-copied from tokens, both a shade off, both close enough to survive
every glance they got. Now imported.
