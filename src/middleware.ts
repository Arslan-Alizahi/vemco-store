import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, readSessionToken } from '@/lib/auth/session'

/**
 * The only thing that runs before both pages and API routes.
 *
 * There was no server-side check of any kind before this. Admin access was a
 * password compared in a client component against a literal in the bundle,
 * with the result kept in localStorage -- readable and writable by anyone who
 * opened the developer tools. Worse, it guarded a *page*: the API behind it
 * was wide open, so nobody even needed to visit the admin. `curl -X PUT
 * /api/products/1` returned 200 with no credentials at all, and `GET
 * /api/orders` returned every customer's name, email, phone and address.
 *
 * A page-level check can never fix that, which is why this is middleware.
 */

/** Whole sections that require a session, pages and their APIs alike. */
const PROTECTED_PREFIXES = ['/admin', '/billing', '/api/admin']

/**
 * Reads here expose customer records, so they are protected as tightly as
 * writes. The public storefront needs none of these.
 */
const PROTECTED_READ_PREFIXES = ['/api/orders', '/api/billing', '/api/customers']

/**
 * Public writes, by necessity.
 *
 * Placing an order and paying for one have to work without an account. They
 * are safe to expose only because the routes themselves stopped trusting the
 * caller: prices come from the catalogue, and the webhook verifies Stripe's
 * signature before it reads anything.
 */
const PUBLIC_WRITE_PATHS = ['/api/orders', '/api/stripe/create-payment', '/api/stripe/webhook']

const isUnder = (pathname: string, prefixes: string[]) =>
  prefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))

const needsSession = (request: NextRequest): boolean => {
  const { pathname } = request.nextUrl
  const method = request.method

  // The way in has to stay open to the logged out, or nobody can ever log in.
  // The route rate-limits itself; the page reveals nothing.
  if (pathname === '/api/admin/login' || pathname === '/admin/login') return false

  /**
   * Checked before the prefix rules, because /api/orders is on both lists:
   * reading it exposes every customer's details, while writing to it is how
   * anyone buys anything. Ordering these the other way round shut checkout
   * for the entire public -- which is what the test for this caught.
   */
  if (PUBLIC_WRITE_PATHS.includes(pathname) && method !== 'GET' && method !== 'HEAD') {
    return false
  }

  if (isUnder(pathname, PROTECTED_PREFIXES)) return true
  if (isUnder(pathname, PROTECTED_READ_PREFIXES)) return true

  // Everything else under /api is public to read and closed to write, so a
  // route added tomorrow is protected the moment it exists rather than
  // whenever somebody remembers to add it to a list.
  if (pathname.startsWith('/api/')) {
    return !(method === 'GET' || method === 'HEAD' || method === 'OPTIONS')
  }

  return false
}

/**
 * Everything a storefront-only build has no business serving.
 *
 * A showcase deployment has no database, so the staff screens could not work
 * even if they were reachable -- and a half-working admin panel on a public
 * URL is worse than none. They are refused outright rather than left to fail
 * on a missing table.
 */
const SHOWCASE_CLOSED = ['/admin', '/billing', '/api/admin', '/api/customers', '/api/orders', '/api/billing', '/api/upload']

export async function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_SHOWCASE === 'true') {
    const { pathname } = request.nextUrl

    if (isUnder(pathname, SHOWCASE_CLOSED)) {
      return pathname.startsWith('/api/')
        ? NextResponse.json(
            { success: false, message: 'Not available on this deployment' },
            { status: 404 }
          )
        : NextResponse.rewrite(new URL('/not-found', request.url))
    }

    // Nothing else needs a session, because nothing else writes.
    return NextResponse.next()
  }

  if (!needsSession(request)) return NextResponse.next()

  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (session) return NextResponse.next()

  // APIs get a status they can act on; pages get sent to the login screen
  // with somewhere to come back to.
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json(
      { success: false, message: 'Sign in to do that' },
      { status: 401 }
    )
  }

  const login = new URL('/admin/login', request.url)
  login.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)
  return NextResponse.redirect(login)
}

export const config = {
  // Everything except static assets and image optimisation. Broad on purpose:
  // the cost of matching a public page is one comparison, and the cost of
  // missing a private one is the whole point of this file.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|seed|.*\\.(?:png|jpg|jpeg|webp|avif|svg|ico)$).*)'],
}
