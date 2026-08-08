import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from './middleware'
import { SESSION_COOKIE, createSessionToken } from '@/lib/auth/session'

/**
 * What is open and what is shut.
 *
 * Before this file existed there was no server-side check at all: `curl -X PUT
 * /api/products/1` returned 200 with no credentials, and `GET /api/orders`
 * returned every customer's name, email, phone and address. The admin
 * password was compared in a client component, so it guarded a page while the
 * data behind it stayed public.
 */
beforeEach(() => {
  process.env.AUTH_SECRET = 'test-secret-value-for-signing-sessions'
})

const request = (path: string, method = 'GET', cookie?: string) =>
  new NextRequest(new URL(`http://localhost${path}`), {
    method,
    ...(cookie ? { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } } : {}),
  })

const signedIn = () => createSessionToken()

describe('closed without a session', () => {
  it.each([
    ['/api/products/1', 'PUT'],
    ['/api/products/1', 'DELETE'],
    ['/api/products', 'POST'],
    ['/api/categories/1', 'DELETE'],
    ['/api/nav/1', 'DELETE'],
    ['/api/social-media/1', 'DELETE'],
    ['/api/upload', 'POST'],
    ['/api/upload', 'DELETE'],
    ['/api/admin/demo-data', 'DELETE'],
    // The migrate endpoint is gone; the migration runs at boot. Kept as a
    // stand-in for any future route under /api/admin.
    ['/api/admin/anything', 'POST'],
  ])('%s %s answers 401', async (path, method) => {
    const response = await middleware(request(path, method))
    expect(response?.status).toBe(401)
  })

  it.each([
    '/api/orders',
    '/api/billing',
    '/api/admin/demo-data',
    '/api/admin/revenue/analytics',
  ])('reading %s answers 401, because it holds customer records', async path => {
    const response = await middleware(request(path))
    expect(response?.status).toBe(401)
  })

  it.each(['/admin', '/admin/revenue', '/admin/revenue/transactions', '/billing'])(
    '%s redirects to the login screen',
    async path => {
      const response = await middleware(request(path))
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toContain('/admin/login')
    }
  )

  it('remembers where you were going', async () => {
    const response = await middleware(request('/admin/revenue'))
    expect(response?.headers.get('location')).toContain('next=%2Fadmin%2Frevenue')
  })
})

describe('open without a session', () => {
  it.each(['/', '/products', '/products/emerald-velvet-sofa', '/cart', '/categories', '/about'])(
    '%s is a public page',
    async path => {
      const response = await middleware(request(path))
      expect(response?.status).toBe(200)
    }
  )

  it.each(['/api/products', '/api/categories', '/api/nav', '/api/social-media'])(
    'reading %s is public, because the storefront needs it',
    async path => {
      const response = await middleware(request(path))
      expect(response?.status).toBe(200)
    }
  )

  /**
   * Buying has to work without an account. These are safe to expose only
   * because the routes stopped trusting the caller: prices are read from the
   * catalogue, and the webhook verifies Stripe's signature first.
   */
  it.each([
    ['/api/orders', 'POST'],
    ['/api/stripe/create-payment', 'POST'],
    ['/api/stripe/webhook', 'POST'],
  ])('%s %s stays public so checkout works', async (path, method) => {
    const response = await middleware(request(path, method))
    expect(response?.status).toBe(200)
  })

  it('leaves the way in open', async () => {
    expect((await middleware(request('/admin/login')))?.status).toBe(200)
    expect((await middleware(request('/api/admin/login', 'POST')))?.status).toBe(200)
  })
})

describe('with a valid session', () => {
  it.each([
    ['/admin', 'GET'],
    ['/billing', 'GET'],
    ['/api/orders', 'GET'],
    ['/api/products/1', 'DELETE'],
    ['/api/admin/demo-data', 'DELETE'],
  ])('%s %s is allowed through', async (path, method) => {
    const response = await middleware(request(path, method, await signedIn()))
    expect(response?.status).toBe(200)
  })
})

describe('with a bad session', () => {
  it.each(['forged', 'a.b', ''])('cookie %j is not a session', async value => {
    const response = await middleware(request('/api/products/1', 'DELETE', value))
    expect(response?.status).toBe(401)
  })

  it('rejects a token signed with a different secret', async () => {
    const token = await signedIn()
    process.env.AUTH_SECRET = 'someone-elses-secret'

    const response = await middleware(request('/api/products/1', 'DELETE', token))
    expect(response?.status).toBe(401)
  })
})

/**
 * A route added tomorrow is closed to writes without anyone remembering to
 * list it. The rule is deny-by-default for anything that changes state.
 */
describe('routes nobody has written yet', () => {
  it.each([
    ['/api/something-new', 'POST'],
    ['/api/something-new', 'PUT'],
    ['/api/something-new', 'PATCH'],
    ['/api/something-new', 'DELETE'],
  ])('%s %s is closed by default', async (path, method) => {
    const response = await middleware(request(path, method))
    expect(response?.status).toBe(401)
  })
})

/**
 * A storefront-only deployment has no database, so the staff screens could
 * not work even if they were reachable. They are refused outright rather
 * than left to fail on a missing table -- a half-working admin panel on a
 * public URL is worse than none.
 */
describe('showcase mode', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SHOWCASE = 'true'
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SHOWCASE
  })

  it.each(['/admin', '/admin/customers', '/admin/revenue', '/billing'])(
    '%s is not served at all',
    async path => {
      const response = await middleware(request(path))
      // Rewritten to the not-found page rather than redirected to a login
      // that leads nowhere.
      expect(response?.status).toBe(200)
      expect(response?.headers.get('x-middleware-rewrite')).toContain('/not-found')
    }
  )

  it.each([
    ['/api/orders', 'POST'],
    ['/api/billing', 'POST'],
    ['/api/customers', 'GET'],
    ['/api/admin/demo-data', 'DELETE'],
    ['/api/upload', 'POST'],
  ])('%s %s answers 404', async (path, method) => {
    const response = await middleware(request(path, method))
    expect(response?.status).toBe(404)
  })

  it.each(['/', '/products', '/categories', '/cart', '/favorites', '/about'])(
    '%s still works, because that is the whole point',
    async path => {
      const response = await middleware(request(path))
      expect(response?.status).toBe(200)
    }
  )

  it.each(['/api/products', '/api/categories', '/api/nav'])(
    'reading %s still works, served from the static catalogue',
    async path => {
      const response = await middleware(request(path))
      expect(response?.status).toBe(200)
    }
  )
})

/**
 * Taking the shop offline without deleting the deployment.
 *
 * The status matters as much as the page. Served as 200 a maintenance screen
 * tells a crawler this is now the content at every URL, which is how a shop
 * reopens to find its product pages replaced in the index by the words "back
 * soon". 503 with Retry-After says temporarily unavailable.
 */
describe('maintenance mode', () => {
  beforeEach(() => {
    process.env.MAINTENANCE_MODE = 'true'
  })

  afterEach(() => {
    delete process.env.MAINTENANCE_MODE
    delete process.env.MAINTENANCE_BYPASS
  })

  it.each(['/', '/products', '/categories', '/cart', '/admin', '/billing', '/api/products'])(
    '%s answers 503, not 200',
    async path => {
      const response = await middleware(request(path))
      expect(response?.status).toBe(503)
      expect(response?.headers.get('retry-after')).toBe('3600')
    }
  )

  it('is never cached, so turning it off takes effect immediately', async () => {
    const response = await middleware(request('/'))
    expect(response?.headers.get('cache-control')).toBe('no-store')
  })

  it('still serves what the page itself needs', async () => {
    for (const path of ['/maintenance', '/_next/static/css/x.css', '/manifest.webmanifest']) {
      const response = await middleware(request(path))
      expect(response?.status, path).toBe(200)
    }
  })

  it('closes the shop even to a signed-in administrator', async () => {
    const response = await middleware(request('/admin', 'GET', await signedIn()))
    expect(response?.status).toBe(503)
  })

  describe('the bypass', () => {
    it('does nothing unless a secret is configured', async () => {
      const response = await middleware(request('/?bypass=anything'))
      expect(response?.status).toBe(503)
    })

    it('refuses the wrong secret', async () => {
      process.env.MAINTENANCE_BYPASS = 'let-me-in'
      const response = await middleware(request('/?bypass=nope'))
      expect(response?.status).toBe(503)
    })

    it('sets a cookie for the right secret and lets that session through', async () => {
      process.env.MAINTENANCE_BYPASS = 'let-me-in'

      const granted = await middleware(request('/?bypass=let-me-in'))
      expect(granted?.status).toBe(307)
      expect(granted?.cookies.get('vemco_bypass')?.value).toBe('let-me-in')

      const withCookie = new NextRequest(new URL('http://localhost/'), {
        headers: { cookie: 'vemco_bypass=let-me-in' },
      })
      expect((await middleware(withCookie))?.status).toBe(200)
    })

    it('refuses a cookie holding the wrong value', async () => {
      process.env.MAINTENANCE_BYPASS = 'let-me-in'
      const withCookie = new NextRequest(new URL('http://localhost/'), {
        headers: { cookie: 'vemco_bypass=guessed' },
      })
      expect((await middleware(withCookie))?.status).toBe(503)
    })
  })

  it('leaves the site alone when it is off', async () => {
    delete process.env.MAINTENANCE_MODE
    expect((await middleware(request('/')))?.status).toBe(200)
    expect((await middleware(request('/products')))?.status).toBe(200)
  })
})
