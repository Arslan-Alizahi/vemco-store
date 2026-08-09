/**
 * Asserts every colour pairing the app renders against WCAG AA.
 *
 * Reads src/design/tokens.ts directly, so the gate cannot drift from the
 * values that ship. Exits non-zero on any failure.
 *
 * Thresholds: 4.5:1 for text (WCAG 1.4.3), 3:1 for UI component boundaries
 * and focus indicators (WCAG 1.4.11).
 */
import { bark, caramel, sage, success, warning, danger, semantic } from '../src/design/tokens.ts'

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

/**
 * Read from the semantic layer, never restated.
 *
 * These were literals -- `bark[50]` and `'#FFFFFF'` -- copied from what the
 * tokens happened to be the day the gate was written. When the page ground
 * and the panels swapped roles, the gate went on measuring the old pair and
 * reported 36/36 for a palette the app no longer rendered. A gate that
 * hardcodes the thing it is checking is decoration.
 */
const CANVAS = semantic.canvas
const SURFACE = semantic.surface
const W = '#FFFFFF'

const PAIRINGS = [
  ['body        bark-900 on canvas', bark[900], CANVAS, 4.5],
  ['body        bark-900 on surface', bark[900], SURFACE, 4.5],
  ['secondary   bark-600 on canvas', bark[600], CANVAS, 4.5],
  ['tertiary    bark-500 on canvas', bark[500], CANVAS, 4.5],
  ['tertiary    bark-500 on surface', bark[500], SURFACE, 4.5],
  ['tertiary    bark-500 on surface-subtle', bark[500], bark[100], 4.5],
  ['secondary   bark-600 on surface-subtle', bark[600], bark[100], 4.5],
  ['link        caramel-700 on surface-subtle', caramel[700], bark[100], 4.5],
  ['link        caramel-700 on canvas', caramel[700], CANVAS, 4.5],
  ['link        caramel-700 on surface', caramel[700], SURFACE, 4.5],
  ['button      white on caramel-600', W, caramel[600], 4.5],
  ['sale        white on sage-600', W, sage[600], 4.5],
  ['danger      white on danger-600', W, danger[600], 4.5],
  ['warning     white on warning-600', W, warning[600], 4.5],
  ['success     white on success-600', W, success[600], 4.5],
  ['focus ring  caramel-600 vs canvas', caramel[600], CANVAS, 3.0],
  ['focus ring  caramel-600 vs surface', caramel[600], SURFACE, 3.0],
  ['border      bark-400 vs canvas', bark[400], CANVAS, 3.0],
  ['border      bark-400 vs surface', bark[400], SURFACE, 3.0],
  ['badge       caramel-900 on caramel-100', caramel[900], caramel[100], 4.5],
  ['badge       sage-900 on sage-100', sage[900], sage[100], 4.5],
  ['badge       danger-900 on danger-100', danger[900], danger[100], 4.5],
  ['badge       warning-900 on warning-100', warning[900], warning[100], 4.5],
  ['markdown    sage-700 on surface', sage[700], SURFACE, 4.5],
  ['growth up   success-700 on surface', success[700], SURFACE, 4.5],
  ['growth down danger-700 on surface', danger[700], SURFACE, 4.5],
  ['source      caramel-900 on caramel-50', caramel[900], caramel[50], 4.5],
  ['source      sage-900 on sage-50', sage[900], sage[50], 4.5],
  ['toggle      success-900 on success-200', success[900], success[200], 4.5],
  ['notice      warning-900 on warning-50', warning[900], warning[50], 4.5],
  ['notice      danger-900 on danger-50', danger[900], danger[50], 4.5],
  ['notice      success-900 on success-50', success[900], success[50], 4.5],
  ['badge       success-900 on success-100', success[900], success[100], 4.5],
  ['ghost hover bark-700 on bark-100', bark[700], bark[100], 4.5],
  ['selected    bark-900 on caramel-50', bark[900], caramel[50], 4.5],
  ['on-brand    caramel-50 on caramel-700', caramel[50], caramel[700], 4.5],

  // The espresso action and the dark footer. Both carry cream rather than
  // white, because white on a warm dark reads blue -- so both have to be
  // measured rather than assumed safe for being "dark plus light".
  ['action      bark-50 on action', bark[50], semantic.action, 4.5],
  ['action hvr  bark-50 on action-hover', bark[50], semantic['action-hover'], 4.5],
  ['inverse     bark-50 on surface-inverse', bark[50], semantic['surface-inverse'], 4.5],
  ['inverse dim bark-300 on surface-inverse', bark[300], semantic['surface-inverse'], 4.5],
  ['inverse rng caramel-300 vs surface-inverse', caramel[300], semantic['surface-inverse'], 3.0],
  ['inverse brd bark-400 vs surface-inverse', bark[400], semantic['surface-inverse'], 3.0],
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
