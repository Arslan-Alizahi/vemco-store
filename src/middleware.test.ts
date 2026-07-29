import { beforeEach, describe, expect, it } from 'vitest'
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
    ['/api/admin/migrate', 'POST'],
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
