/**
 * Three checks over every storefront route.
 *
 * axe-core, for what the contrast gate cannot see. That gate proves the
 * palette is sound in the abstract; this one reads the assembled page —
 * labels on controls, alternative text, heading order, landmark structure,
 * name-role-value on anything custom, and contrast as composited rather than
 * as specified. It is what caught the primary button rendering at 3.49:1.
 *
 * Reflow (WCAG 1.4.10), because axe does not check it. Content has to work at
 * 320 CSS pixels with no horizontal scrolling, and at 640 — which is a 1280
 * desktop zoomed to 200%, the resize-text case from 1.4.4.
 *
 * Reduced motion, because it fails in the worst possible way. A framer-motion
 * element whose animation never runs stays pinned at its initial keyframe, so
 * a mis-wired MotionConfig does not merely stop the movement, it leaves the
 * content at opacity 0. That happened here once already, and the page looked
 * blank to exactly the people who asked for less motion.
 *
 * Runs against the production build, not the dev server: dev overlays inject
 * their own markup, and it is the shipped bundle that matters.
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { randomBytes, scrypt } from 'node:crypto'
import { promisify } from 'node:util'
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'

const scryptAsync = promisify(scrypt)

/**
 * Credentials for this run only, generated here and handed to the server we
 * start. The staff screens sit behind a session now, so auditing them means
 * holding one -- and inventing a throwaway password beats either weakening
 * the gate to let it in or leaving admin unaudited.
 */
const buildCredentials = async () => {
  const password = randomBytes(12).toString('base64url')
  const salt = randomBytes(16)
  const derived = await scryptAsync(password, salt, 32, {
    N: 32_768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  })

  return {
    password,
    env: {
      AUTH_SECRET: randomBytes(32).toString('base64'),
      ADMIN_PASSWORD_HASH: `scrypt:${salt.toString('base64')}:${derived.toString('base64')}`,
    },
  }
}

const PORT = process.env.A11Y_PORT || 3210
const ORIGIN = `http://127.0.0.1:${PORT}`

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'phone', width: 375, height: 812 },
]

const REFLOW_WIDTHS = [
  { name: '320px', width: 320, height: 800 }, // 1.4.10 Reflow
  { name: '200% zoom', width: 640, height: 512 }, // 1.4.4 Resize text, 1280 at 200%
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
  // The staff screens, audited signed in. The gate mints a throwaway password
  // and holds a session, so these are the real dashboards rather than four
  // copies of the login screen a redirect would have produced.
  '/admin/login',
  '/admin',
  '/billing',
  '/admin/revenue',
  '/admin/revenue/transactions',
]

/**
 * Refuses to run if something already holds the port.
 *
 * Otherwise the gate quietly tests whatever is already listening. A leftover
 * server from an earlier build serves HTML referencing chunk hashes that no
 * longer exist on disk, every page 400s on its own JavaScript, nothing
 * hydrates, and framer-motion never runs -- so the whole storefront reports
 * as stuck at opacity 0. A believable-looking failure, in a build that is
 * completely fine.
 */
const requireFreePort = async () => {
  try {
    await fetch(ORIGIN, { signal: AbortSignal.timeout(2000) })
  } catch {
    return
  }
  console.error(
    `  Something is already listening on ${ORIGIN}.\n` +
      '  Stop it first — otherwise this gate tests that server, not this build.\n' +
      '  Set A11Y_PORT to use a different port.\n'
  )
  process.exit(1)
}

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

/**
 * Says so plainly when there is no build to serve.
 *
 * `next dev` writes over .next with development artefacts, so running the dev
 * server after a build leaves no production build behind. Without this the
 * only symptom is the server never answering, and ninety seconds of silence
 * followed by a timeout points nowhere near the actual cause.
 */
const requireBuild = () => {
  if (existsSync(join(process.cwd(), '.next', 'BUILD_ID'))) return
  console.error(
    '  No production build in .next. Run `npm run build` first.\n' +
      '  (`next dev` overwrites it, so a dev session since the last build is enough to do this.)\n'
  )
  process.exit(1)
}

const startServer = env => {
  const server = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['next', 'start', '--port', String(PORT)],
    { stdio: 'ignore', shell: process.platform === 'win32', env: { ...process.env, ...env } }
  )
  server.on('error', error => {
    console.error('Could not start the server:', error.message)
    process.exit(1)
  })

  // The `finally` block does not run if this process dies abruptly, and a
  // truncating pipe -- `npm run verify:a11y | head` -- does exactly that.
  // The server survives, and the next run trips the port guard instead of
  // testing anything.
  const stop = () => {
    try {
      server.kill()
    } catch {
      // Already gone.
    }
  }
  process.on('exit', stop)
  process.on('SIGINT', () => { stop(); process.exit(130) })
  process.on('SIGTERM', () => { stop(); process.exit(143) })
  process.on('uncaughtException', error => {
    stop()
    console.error(error)
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

/**
 * Reports anything sticking out past the viewport, and names it.
 *
 * A bare "the page scrolls sideways" is close to useless on a page with a
 * thousand elements, so this returns the offending boxes. Elements inside a
 * deliberately scrollable strip -- the featured carousel -- are ignored,
 * since overflowing their own container is the entire point.
 */
const findOverflow = page =>
  page.evaluate(() => {
    const root = document.documentElement
    const overflow = root.scrollWidth - root.clientWidth
    if (overflow <= 0) return { overflow: 0, culprits: [] }

    const scrollable = element => {
      for (let node = element.parentElement; node; node = node.parentElement) {
        const overflowX = getComputedStyle(node).overflowX
        if (overflowX === 'auto' || overflowX === 'scroll') return true
      }
      return false
    }

    const culprits = []
    for (const element of document.querySelectorAll('body *')) {
      const box = element.getBoundingClientRect()
      if (box.width === 0 || box.height === 0) continue
      if (box.right <= root.clientWidth + 1 && box.left >= -1) continue
      if (scrollable(element)) continue
      culprits.push({
        tag: element.tagName.toLowerCase(),
        classes: String(element.className || '').slice(0, 70),
        left: Math.round(box.left),
        right: Math.round(box.right),
      })
    }
    return { overflow, culprits: culprits.slice(0, 5) }
  })

/**
 * Runs in the page. Anything framer-motion touched that is on screen and not
 * yet fully opaque.
 *
 * Reduced motion keeps the opacity fade and drops the transforms -- a fade is
 * not what triggers vestibular symptoms -- so a partly-faded element is
 * normal and only a permanently faded one is a fault.
 */
const STUCK_PROBE = `
  Array.from(document.querySelectorAll('[style*="opacity"], [style*="transform"]'))
    .filter(element => {
      const box = element.getBoundingClientRect()
      if (box.width === 0 || box.height === 0) return false
      if (box.top > window.innerHeight) return false
      return Number(getComputedStyle(element).opacity) < 0.99
    })
`

/**
 * Waits for the fades to land, then reports whatever did not.
 *
 * Measuring immediately catches the homepage hero mid-fade at 0.87 and calls
 * it broken, which it is not. The real failure -- framer rejecting an easing
 * and pinning the element to its initial keyframe -- sits at opacity 0 and
 * stays there, so anything still faded after this window genuinely is.
 */
const findStuckAnimations = async page => {
  try {
    await page.waitForFunction(`${STUCK_PROBE}.length === 0`, null, { timeout: 3000 })
    return []
  } catch {
    return page.evaluate(`
      ${STUCK_PROBE}
        .slice(0, 5)
        .map(element => ({
          tag: element.tagName.toLowerCase(),
          classes: String(element.className || '').slice(0, 70),
          opacity: getComputedStyle(element).opacity,
        }))
    `)
  }
}

/**
 * Tabs through a page and reports any stop with no visible focus indicator.
 *
 * axe cannot check this -- it reads a static snapshot, and focus styling only
 * exists while something is focused. It went unnoticed here because the
 * primitives all carry their own ring, so the gap was only in hand-written
 * anchors: three breadcrumb links and an inline link to the delivery terms,
 * on the page a keyboard user is most likely to be reading carefully.
 *
 * "Has an outline" is not the test. Tailwind's outline-none sets a
 * transparent 2px outline rather than removing it, so the components that ring
 * themselves with a box-shadow all look outlined and all measure as passing.
 * The only honest test is whether anything changed: styles are read focused,
 * then blurred, then compared.
 */
const findUnfocusableStops = async (page, limit = 25) => {
  const bad = []

  for (let step = 0; step < limit; step += 1) {
    await page.keyboard.press('Tab')

    const result = await page.evaluate(() => {
      const element = document.activeElement
      if (!element || element === document.body) return null

      const read = () => {
        const style = getComputedStyle(element)
        return {
          outline: `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`,
          shadow: style.boxShadow,
          border: `${style.borderColor} ${style.borderWidth}`,
          background: style.backgroundColor,
          text: style.color,
        }
      }

      const focused = read()
      element.blur()
      const blurred = read()
      element.focus()

      const changed = Object.keys(focused).some(key => focused[key] !== blurred[key])
      if (changed) return null

      return {
        tag: element.tagName.toLowerCase(),
        label: (element.getAttribute('aria-label') || element.textContent || '').trim().slice(0, 44),
      }
    })

    if (result) bad.push(result)
  }

  return bad
}

const run = async () => {
  requireBuild()
  await requireFreePort()

  const credentials = await buildCredentials()
  const server = startServer(credentials.env)
  let browser

  try {
    await waitForServer(ORIGIN)

    const routes = [...STATIC_ROUTES, ...(await discoverProductRoute())]
    browser = await chromium.launch()

    /**
     * Sign in once and reuse the cookie for every context below.
     *
     * Without it the staff routes would redirect to the login screen and the
     * gate would quietly audit that page four times over while reporting
     * /admin, /billing and /admin/revenue as passing.
     */
    const signIn = await fetch(`${ORIGIN}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: credentials.password }),
    })

    const setCookie = signIn.headers.get('set-cookie') || ''
    const sessionValue = setCookie.split(';')[0]?.split('=').slice(1).join('=')

    if (!signIn.ok || !sessionValue) {
      console.error('  Could not sign in to audit the staff screens.\n')
      process.exitCode = 1
      return
    }

    const sessionCookie = {
      name: setCookie.split('=')[0],
      value: sessionValue,
      domain: '127.0.0.1',
      path: '/',
    }

    const failures = []
    let checks = 0
    let reflowFailures = 0
    let motionFailures = 0
    let focusFailures = 0

    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        storageState: { cookies: [sessionCookie], origins: [] },
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

    console.log('')

    for (const width of REFLOW_WIDTHS) {
      const context = await browser.newContext({
        storageState: { cookies: [sessionCookie], origins: [] },
        viewport: { width: width.width, height: width.height },
      })
      const page = await context.newPage()

      for (const route of routes) {
        await page.goto(`${ORIGIN}${route}`, { waitUntil: 'networkidle' })
        const { overflow, culprits } = await findOverflow(page)
        checks += 1

        console.log(
          `  ${(overflow === 0 ? 'PASS' : 'FAIL').padEnd(6)}${width.name.padEnd(11)}${route.padEnd(28)}${
            overflow === 0 ? '' : `${overflow}px of horizontal scroll`
          }`
        )
        for (const culprit of culprits) {
          console.log(`         <${culprit.tag}> ${culprit.left}..${culprit.right}  ${culprit.classes}`)
        }
        if (overflow > 0) reflowFailures += 1
      }

      await context.close()
    }

    console.log('')

    const reducedContext = await browser.newContext({
        storageState: { cookies: [sessionCookie], origins: [] },
      viewport: { width: 1280, height: 900 },
      reducedMotion: 'reduce',
    })
    const reducedPage = await reducedContext.newPage()

    for (const route of routes) {
      await reducedPage.goto(`${ORIGIN}${route}`, { waitUntil: 'networkidle' })
      const stuck = await findStuckAnimations(reducedPage)
      checks += 1

      console.log(
        `  ${(stuck.length === 0 ? 'PASS' : 'FAIL').padEnd(6)}${'reduced'.padEnd(11)}${route.padEnd(28)}${
          stuck.length === 0 ? '' : `${stuck.length} element(s) stuck below opacity 1`
        }`
      )
      for (const element of stuck) {
        console.log(`         <${element.tag}> opacity ${element.opacity}  ${element.classes}`)
      }
      if (stuck.length > 0) motionFailures += 1
    }

    await reducedContext.close()

    console.log('')

    const focusContext = await browser.newContext({
        storageState: { cookies: [sessionCookie], origins: [] }, viewport: { width: 1280, height: 900 } })
    const focusPage = await focusContext.newPage()

    for (const route of routes) {
      await focusPage.goto(`${ORIGIN}${route}`, { waitUntil: 'networkidle' })
      const invisible = await findUnfocusableStops(focusPage)
      checks += 1

      console.log(
        `  ${(invisible.length === 0 ? 'PASS' : 'FAIL').padEnd(6)}${'focus'.padEnd(11)}${route.padEnd(28)}${
          invisible.length === 0 ? '' : `${invisible.length} stop(s) with no visible focus`
        }`
      )
      for (const stop of invisible) {
        console.log(`         <${stop.tag}> "${stop.label}"`)
      }
      if (invisible.length > 0) focusFailures += 1
    }

    await focusContext.close()

    console.log(`\n  ${checks} checks across ${routes.length} routes`)

    if (focusFailures > 0) {
      console.log(
        `\n  ${focusFailures} route(s) have a tab stop with no visible focus. WCAG 2.4.7.`
      )
      process.exitCode = 1
    }

    if (reflowFailures > 0) {
      console.log(`\n  ${reflowFailures} route(s) scroll horizontally. WCAG 1.4.10 Reflow.`)
      process.exitCode = 1
    }

    if (motionFailures > 0) {
      console.log(
        `\n  ${motionFailures} route(s) leave content invisible with reduced motion on.`
      )
      process.exitCode = 1
    }

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

    if (process.exitCode) {
      console.log('')
      return
    }

    console.log(
      '  No WCAG A or AA violations. Reflow clean, nothing stuck, every tab stop visible.\n'
    )
  } finally {
    if (browser) await browser.close()
    server.kill()
  }
}

console.log('\nAccessibility gate — axe-core, WCAG 2.1 A and AA\n')
await run()
