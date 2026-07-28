/**
 * Runs axe-core over every storefront route, at desktop and phone widths.
 *
 * The contrast gate proves the palette is sound in the abstract; it says
 * nothing about what the pages actually render. This checks the assembled
 * page: labels on controls, alternative text, heading order, landmark
 * structure, name-role-value on anything custom, and colour contrast as
 * composited rather than as specified.
 *
 * Both widths matter because layout changes what exists. The product page's
 * buy bar only mounts under lg, and a control that appears on one width and
 * not the other is a control only one of the two runs can see.
 *
 * Serves the production build, not the dev server: dev overlays inject their
 * own markup, and it is the shipped bundle we care about.
 */

import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'

const PORT = process.env.A11Y_PORT || 3210
const ORIGIN = `http://127.0.0.1:${PORT}`

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'phone', width: 375, height: 812 },
]

/** WCAG only. Best-practice rules are advisory and would make the gate noise. */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

const STATIC_ROUTES = [
  '/',
  '/products',
  '/categories',
  '/cart',
  '/favorites',
  '/about',
  '/contact',
  '/faq',
  '/shipping',
  '/blog',
  '/careers',
  '/press',
  '/policies/privacy',
  '/policies/terms',
  '/policies/returns',
  '/policies/cookies',
]

const waitForServer = async (url, timeoutMs = 90_000) => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Not listening yet.
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  throw new Error(`Server did not come up at ${url} within ${timeoutMs}ms`)
}

const startServer = () => {
  const server = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['next', 'start', '--port', String(PORT)],
    { stdio: 'ignore', shell: process.platform === 'win32' }
  )
  server.on('error', error => {
    console.error('Could not start the server:', error.message)
    process.exit(1)
  })
  return server
}

/**
 * A product URL from the live catalogue rather than a hardcoded slug, so the
 * gate does not silently stop covering the product page the day someone
 * renames a seed item.
 */
const discoverProductRoute = async () => {
  try {
    const response = await fetch(`${ORIGIN}/api/products?limit=1`)
    const body = await response.json()
    const slug = body?.data?.products?.[0]?.slug
    return slug ? [`/products/${slug}`] : []
  } catch {
    return []
  }
}

const run = async () => {
  const server = startServer()
  let browser

  try {
    await waitForServer(ORIGIN)

    const routes = [...STATIC_ROUTES, ...(await discoverProductRoute())]
    browser = await chromium.launch()

    const failures = []
    let checks = 0

    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      })
      const page = await context.newPage()

      for (const route of routes) {
        await page.goto(`${ORIGIN}${route}`, { waitUntil: 'networkidle' })

        const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze()
        checks += 1

        const status = violations.length === 0 ? 'PASS' : 'FAIL'
        console.log(
          `  ${status.padEnd(6)}${viewport.name.padEnd(9)}${route.padEnd(28)}${
            violations.length === 0 ? '' : `${violations.length} violation(s)`
          }`
        )

        for (const violation of violations) {
          failures.push({ route, viewport: viewport.name, violation })
        }
      }

      await context.close()
    }

    console.log(`\n  ${checks} page checks across ${routes.length} routes and ${VIEWPORTS.length} widths`)

    if (failures.length > 0) {
      console.log('\n  Violations\n')
      for (const { route, viewport, violation } of failures) {
        console.log(`  ${violation.id}  [${violation.impact}]  ${route} @ ${viewport}`)
        console.log(`    ${violation.help}`)
        console.log(`    ${violation.helpUrl}`)
        for (const node of violation.nodes.slice(0, 3)) {
          console.log(`    -> ${node.target.join(' ')}`)
          console.log(`       ${node.failureSummary?.split('\n').join('\n       ')}`)
        }
        if (violation.nodes.length > 3) {
          console.log(`    -> and ${violation.nodes.length - 3} more element(s)`)
        }
        console.log('')
      }
      console.log(`${failures.length} accessibility violation(s).\n`)
      process.exitCode = 1
      return
    }

    console.log('  No WCAG A or AA violations.\n')
  } finally {
    if (browser) await browser.close()
    server.kill()
  }
}

console.log('\nAccessibility gate — axe-core, WCAG 2.1 A and AA\n')
await run()
