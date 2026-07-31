/**
 * Finds design tokens, utilities and components that exist but are never used.
 *
 * Three things have now been built and left with no call sites -- Tilt,
 * Parallax and AnimatedCounter sat unused until somebody asked where the
 * animation was, and shadow-well is still sitting there. A token nobody
 * reaches for is not neutral: it is a decision the next person has to read,
 * evaluate and then discover was never real.
 *
 * Reports rather than fails. Some of this is deliberate -- a scale can
 * legitimately carry a step held in reserve -- so the judgement stays with a
 * person. It just stops the list being invisible.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()

const walk = (dir, match = /\.(tsx?|css)$/) => {
  const out = []
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name.startsWith('.')) continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) out.push(...walk(path, match))
    else if (match.test(name)) out.push(path)
  }
  return out
}

const files = walk(join(ROOT, 'src'))
const sources = new Map(files.map(file => [relative(ROOT, file), readFileSync(file, 'utf8')]))
const haystack = [...sources.values()].join('\n')

const tailwind = readFileSync(join(ROOT, 'tailwind.config.ts'), 'utf8')
const globals = sources.get(join('src', 'app', 'globals.css')) ?? ''

/** Keys of a `name: { ... }` block in the Tailwind config. */
const keysOf = section => {
  const block = tailwind.match(new RegExp(`${section}:\\s*\\{([\\s\\S]*?)\\n      \\}`))
  if (!block) return []
  return [...block[1].matchAll(/^\s*'?([\w-]+)'?:/gm)].map(m => m[1])
}

/**
 * Every occurrence across src.
 *
 * globals.css counts as a consumer, not a definition. Excluding it reported
 * shadow-lift, shadow-rim, bg-fade-up and animate-shimmer as dead when each is
 * used by the very utility built on top of it -- four false positives, which
 * is exactly how an audit like this stops being trusted.
 */
const usedIn = needle => {
  let count = 0
  for (const [, source] of sources) count += source.split(needle).length - 1
  return count
}

/**
 * A token can be reached two ways: as a generated class (shadow-rim) or
 * through theme() inside globals.css. Counting only the first reported
 * shadow-rim as dead while .glass-dark was using it.
 */
const usedAsTokenOrClass = (prefix, section, key) =>
  usedIn(`${prefix}-${key}`) + usedIn(`${section}.${key}`)

/** A token defined in the config and referenced only there is unused. */
const usedBeyondDefinition = (needle, definitionCount = 0) =>
  usedIn(needle) - definitionCount

const groups = [
  {
    title: 'Shadows',
    items: keysOf('boxShadow').map(k => ({ name: `shadow-${k}`, uses: usedAsTokenOrClass('shadow', 'boxShadow', k) })),
  },
  {
    title: 'Background gradients',
    items: keysOf('backgroundImage').map(k => ({ name: `bg-${k}`, uses: usedAsTokenOrClass('bg', 'backgroundImage', k) })),
  },
  {
    title: 'Radii',
    items: keysOf('borderRadius').map(k => ({ name: `rounded-${k}`, uses: usedIn(`rounded-${k}`) })),
  },
  {
    title: 'Type scale',
    items: keysOf('fontSize').map(k => ({ name: `text-${k}`, uses: usedIn(`text-${k}`) })),
  },
  {
    title: 'Section spacing',
    items: keysOf('spacing').map(k => ({ name: k, uses: usedIn(k) })),
  },
  {
    title: 'Stacking',
    items: keysOf('zIndex').map(k => ({ name: `z-${k}`, uses: usedIn(`z-${k}`) })),
  },
  {
    title: 'Animations',
    items: keysOf('animation').map(k => ({ name: `animate-${k}`, uses: usedIn(`animate-${k}`) })),
  },
  {
    title: 'Custom utilities in globals.css',
    items: [...globals.matchAll(/^\s{2}\.([\w-]+)\s*\{/gm)]
      .map(m => m[1])
      .filter((name, index, all) => all.indexOf(name) === index)
      .map(name => ({ name: `.${name}`, uses: usedIn(name) - 1 })),
  },
]

/** Components with no importer anywhere. */
const componentFiles = files.filter(
  file => /components[\\/].*\.tsx$/.test(file) && !/\.test\.tsx$/.test(file)
)

const components = componentFiles.map(file => {
  const rel = relative(ROOT, file)
  const name = rel.split(/[\\/]/).pop().replace('.tsx', '')
  if (name === 'index') return null

  let uses = 0
  for (const [other, source] of sources) {
    if (other === rel) continue
    if (/index\.tsx?$/.test(other)) continue // A barrel re-export is not a use.
    if (new RegExp(`\\b${name}\\b`).test(source)) uses += 1
  }
  return { name, uses, file: rel }
}).filter(Boolean)

groups.push({ title: 'Components', items: components })

let unusedTotal = 0
console.log('\nUnused design tokens, utilities and components\n')

for (const group of groups) {
  const unused = group.items.filter(item => item.uses === 0)
  if (unused.length === 0) continue

  unusedTotal += unused.length
  console.log(`  ${group.title}`)
  for (const item of unused) {
    console.log(`    ${item.name}${item.file ? `   (${item.file})` : ''}`)
  }
  console.log('')
}

console.log(
  unusedTotal === 0
    ? '  Everything defined is used somewhere.\n'
    : `  ${unusedTotal} defined but never used.\n`
)
