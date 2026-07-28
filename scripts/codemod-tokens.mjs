/**
 * Migrates raw Tailwind colour literals onto the design tokens.
 *
 * Run: node scripts/codemod-tokens.mjs [--dry]
 *
 * Two passes, in order:
 *
 *  1. SEMANTIC — where a literal has exactly the same computed value as a
 *     semantic alias, swap it. Zero visual change, and the call site now
 *     states intent ("secondary text") instead of a coordinate on a ramp.
 *
 *  2. RAMP RENAME — everything left over moves gray-* -> bark-* and
 *     primary-* -> caramel-*. Also a pure rename, since the Tailwind config
 *     currently aliases those names onto exactly these ramps. Once this pass
 *     is clean the aliases can be deleted.
 *
 * One deliberate exception is called out below: border-gray-300.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DRY = process.argv.includes('--dry')
const ROOT = 'src'

/** Exact-value equivalences. Verified against src/design/tokens.ts. */
const SEMANTIC = [
  // bark-900 === semantic.text-primary
  ['text-gray-900', 'text-text-primary'],
  // bark-600 === semantic.text-secondary
  ['text-gray-600', 'text-text-secondary'],
  // bark-500 === semantic.text-tertiary
  ['text-gray-500', 'text-text-tertiary'],
  // #FFFFFF === semantic.surface
  ['bg-white', 'bg-surface'],
  // bark-50 === semantic.canvas
  ['bg-gray-50', 'bg-canvas'],
  // bark-100 === semantic.surface-subtle
  ['bg-gray-100', 'bg-surface-subtle'],
  // bark-200 === semantic.border-subtle
  ['border-gray-200', 'border-border-subtle'],
  ['divide-gray-200', 'divide-border-subtle'],

  // NOT an equivalence -- a deliberate fix. gray-300 maps to bark-300, which
  // is 1.9:1 against the canvas and fails WCAG 1.4.11 for a control boundary.
  // border-strong is bark-400 at 3.24:1. Inputs and selects get a slightly
  // darker edge, which is the point.
  ['border-gray-300', 'border-border-strong'],
]

/** Everything else is a straight ramp rename. */
const RAMPS = [
  [/\bgray-(\d{2,3})\b/g, 'bark-$1'],
  [/\bprimary-(\d{2,3})\b/g, 'caramel-$1'],
]

const files = []
const walk = dir => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) walk(path)
    else if (/\.(tsx|ts)$/.test(path) && !/\.test\.ts$/.test(path)) files.push(path)
  }
}
walk(ROOT)

let semanticCount = 0
let rampCount = 0
let touched = 0

for (const file of files) {
  const before = readFileSync(file, 'utf8')
  let after = before

  for (const [from, to] of SEMANTIC) {
    // Bounded so `bg-gray-50` never eats the `bg-gray-500` next to it.
    const re = new RegExp(`(?<![\\w-])${from}(?![\\w-])`, 'g')
    const hits = after.match(re)
    if (hits) {
      semanticCount += hits.length
      after = after.replace(re, to)
    }
  }

  for (const [re, to] of RAMPS) {
    const hits = after.match(re)
    if (hits) {
      rampCount += hits.length
      after = after.replace(re, to)
    }
  }

  if (after !== before) {
    touched++
    if (!DRY) writeFileSync(file, after, 'utf8')
  }
}

console.log(`${DRY ? 'Would change' : 'Changed'} ${touched} files`)
console.log(`  semantic swaps : ${semanticCount}`)
console.log(`  ramp renames   : ${rampCount}`)
console.log(`  total          : ${semanticCount + rampCount}`)
