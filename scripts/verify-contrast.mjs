/**
 * Asserts every colour pairing the app renders against WCAG AA.
 *
 * Reads src/design/tokens.ts directly, so it can never drift from the values
 * that ship. Exits non-zero on any failure. Wired into `npm run verify`.
 *
 * Thresholds: 4.5:1 for text (WCAG 1.4.3), 3:1 for UI component boundaries
 * and focus indicators (WCAG 1.4.11).
 */
import { stone, forest, clay, success, warning, danger } from '../src/design/tokens.ts'

const channels = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))

const luminance = h =>
  channels(h)
    .map(v => {
      v /= 255
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    })
    .reduce((acc, v, i) => acc + v * [0.2126, 0.7152, 0.0722][i], 0)

const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const CANVAS = stone[50]
const SURFACE = '#FFFFFF'
const W = '#FFFFFF'

const PAIRINGS = [
  ['body        stone-900 on canvas', stone[900], CANVAS, 4.5],
  ['body        stone-900 on surface', stone[900], SURFACE, 4.5],
  ['secondary   stone-600 on canvas', stone[600], CANVAS, 4.5],
  ['tertiary    stone-500 on canvas', stone[500], CANVAS, 4.5],
  ['tertiary    stone-500 on surface', stone[500], SURFACE, 4.5],
  ['link        forest-700 on canvas', forest[700], CANVAS, 4.5],
  ['link        forest-700 on surface', forest[700], SURFACE, 4.5],
  ['button      white on forest-600', W, forest[600], 4.5],
  ['sale        white on clay-600', W, clay[600], 4.5],
  ['danger      white on danger-600', W, danger[600], 4.5],
  ['warning     white on warning-600', W, warning[600], 4.5],
  ['success     white on success-600', W, success[600], 4.5],
  ['focus ring  forest-600 vs canvas', forest[600], CANVAS, 3.0],
  ['focus ring  forest-600 vs surface', forest[600], SURFACE, 3.0],
  ['border      stone-400 vs canvas', stone[400], CANVAS, 3.0],
  ['border      stone-400 vs surface', stone[400], SURFACE, 3.0],
  ['badge       forest-900 on forest-100', forest[900], forest[100], 4.5],
  ['badge       clay-900 on clay-100', clay[900], clay[100], 4.5],
  ['badge       danger-900 on danger-100', danger[900], danger[100], 4.5],
  ['badge       warning-900 on warning-100', warning[900], warning[100], 4.5],
  ['badge       success-900 on success-100', success[900], success[100], 4.5],
  ['ghost hover stone-700 on stone-100', stone[700], stone[100], 4.5],
  ['selected    stone-900 on forest-50', stone[900], forest[50], 4.5],
]

let failed = 0
console.log('  RATIO   MIN   RESULT  PAIRING')
for (const [name, fg, bg, min] of PAIRINGS) {
  const r = ratio(fg, bg)
  const ok = r >= min
  if (!ok) failed++
  console.log(
    `  ${r.toFixed(2).padStart(5)}  ${min.toFixed(1)}   ${ok ? 'PASS' : 'FAIL'}    ${name}`
  )
}

console.log(`\n  ${PAIRINGS.length - failed}/${PAIRINGS.length} pass`)

if (failed) {
  console.error(`\n  WCAG AA FAILURE: ${failed} pairing(s) below threshold.`)
  process.exit(1)
}
