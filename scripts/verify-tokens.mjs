/**
 * Fails the build when a colour is written by hand instead of read from the
 * design tokens.
 *
 * The migration that produced src/design/tokens.ts replaced 784 literals. The
 * only thing keeping that from happening again is a gate, because a raw hex
 * looks completely normal in a diff and nothing else in the toolchain objects
 * to it. Two values in this repo had already drifted a shade off the token
 * they were copied from -- #FAF8F5 against a canvas of #FAF9F6 -- and neither
 * a type check nor a build nor a review caught it.
 *
 * Three things are refused:
 *   - hex, rgb() and hsl() literals outside the token file
 *   - Tailwind's default palette (gray, blue, red...), which is not our ramp
 *   - arbitrary colour values in square brackets, e.g. bg-[#123456]
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = process.cwd()

/**
 * Nothing is excluded any more.
 *
 * Admin, POS and billing were held out while the storefront was refactored,
 * listed here by name with their literal count printed on every run so the
 * debt stayed visible rather than quietly becoming the status quo. They have
 * since been migrated, so the list is empty and the gate covers everything.
 */
const OUT_OF_SCOPE = []

/** The one file allowed to state a colour value. */
const TOKEN_FILE = join('src', 'design', 'tokens.ts')

/**
 * `rgb(${rgbOf(token)} / 0.08)` is the sanctioned way to give a ramp colour an
 * alpha, so the whole construct is stripped before matching -- not just the
 * rgbOf call, which would leave a bare `rgb(` behind and fail anyway.
 */
const TOKEN_COLOUR = /rgb\(\$\{rgbOf\([^)]*\)\}[^)]*\)/g

const TAILWIND_DEFAULT_PALETTE = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
]

const UTILITY_PREFIXES = [
  'text', 'bg', 'border', 'ring', 'ring-offset', 'from', 'to', 'via', 'divide',
  'outline', 'decoration', 'fill', 'stroke', 'accent', 'caret', 'placeholder', 'shadow',
]

const RULES = [
  {
    id: 'default-palette',
    pattern: new RegExp(
      `\\b(?:${UTILITY_PREFIXES.join('|')})-(?:${TAILWIND_DEFAULT_PALETTE.join('|')})-\\d{2,3}\\b`,
      'g'
    ),
    message: "Tailwind's default palette. Use a Vimco Furniture House ramp or a semantic alias.",
  },
  {
    id: 'hex',
    pattern: /#[0-9a-fA-F]{3,8}\b/g,
    message: 'Hex literal. Import the value from src/design/tokens.ts.',
  },
  {
    id: 'colour-function',
    pattern: /\b(?:rgba?|hsla?)\s*\(/g,
    message: 'Raw colour function. Import the value from src/design/tokens.ts.',
  },
  {
    id: 'arbitrary-colour',
    pattern: /-\[\s*(?:#[0-9a-fA-F]{3,8}|(?:rgba?|hsla?)\()/g,
    message: 'Arbitrary colour in a Tailwind class. Use theme() or a token.',
  },
]

/**
 * Strips comments and Tailwind's own theme() calls before matching.
 *
 * Without this the gate flags its own explanatory comments -- Button.tsx
 * documents the AA failure it replaced by naming bg-yellow-500 -- and flags
 * bg-[radial-gradient(...theme(colors.caramel.800)...)], which is exactly the
 * token-driven form we want people to reach for.
 */
const strip = source =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
    .replace(/theme\([^)]*\)/g, ' ')
    .replace(TOKEN_COLOUR, ' ')

const walk = dir => {
  const entries = []
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name.startsWith('.')) continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) entries.push(...walk(path))
    else if (/\.(tsx?|css)$/.test(name)) entries.push(path)
  }
  return entries
}

/**
 * tailwind.config.ts is scanned too.
 *
 * It was not, and that is where the drift went to hide: a keyframe carried
 * rgb(184 68 47), a red belonging to no ramp here, and two gradients restated
 * bark-950 and caramel-800 by hand in rgb() form. The one file that defines
 * the palette was the one file nothing checked.
 */
const files = [...walk(join(ROOT, 'src')), join(ROOT, 'tailwind.config.ts')]
const failures = []
let outOfScopeCount = 0

for (const file of files) {
  const rel = relative(ROOT, file)
  if (rel === TOKEN_FILE) continue

  const skipped = OUT_OF_SCOPE.some(prefix => rel === prefix || rel.startsWith(prefix + sep))
  const source = strip(readFileSync(file, 'utf8'))
  const lines = source.split('\n')

  for (const rule of RULES) {
    lines.forEach((line, index) => {
      for (const match of line.matchAll(rule.pattern)) {
        if (skipped) {
          outOfScopeCount += 1
          continue
        }
        failures.push({ file: rel, line: index + 1, rule, match: match[0].trim() })
      }
    })
  }
}

const label = { 'default-palette': 'palette', hex: 'hex', 'colour-function': 'rgb/hsl', 'arbitrary-colour': 'arbitrary' }

console.log(`\nRaw colour gate — ${files.length} files scanned\n`)

for (const failure of failures) {
  console.log(
    `  ${'FAIL'.padEnd(6)}${label[failure.rule.id].padEnd(11)}${failure.match.padEnd(24)}${failure.file}:${failure.line}`
  )
  console.log(`  ${' '.repeat(17)}${failure.rule.message}`)
}

if (outOfScopeCount > 0) {
  console.log(`
  ${outOfScopeCount} literal(s) in excluded paths.`)
}

if (failures.length > 0) {
  console.log(`\n${failures.length} raw colour literal(s). Every colour comes from src/design/tokens.ts.\n`)
  process.exit(1)
}

console.log('  No raw colour literals anywhere in src.\n')
