import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSessionToken, isAuthConfigured, readSessionToken } from './session'
import { hashPassword, verifyPassword } from './password'

const SECRET = 'test-secret-value-for-signing-sessions'

beforeEach(() => {
  process.env.AUTH_SECRET = SECRET
})

afterEach(() => {
  delete process.env.AUTH_SECRET
  delete process.env.ADMIN_PASSWORD_HASH
})

describe('session tokens', () => {
  it('recognises a token it issued', async () => {
    const token = await createSessionToken()
    expect(await readSessionToken(token)).toMatchObject({ sub: 'admin' })
  })

  /**
   * The point of the whole mechanism. The old gate stored `admin_authenticated
   * = true` in localStorage, so becoming an administrator was two words in a
   * console. A forged token has to survive an HMAC it cannot compute.
   */
  it('rejects a token it did not issue', async () => {
    const token = await createSessionToken()
    process.env.AUTH_SECRET = 'a-different-secret-entirely'
    expect(await readSessionToken(token)).toBeNull()
  })

  it('rejects a tampered payload', async () => {
    const token = await createSessionToken()
    const [, signature] = token.split('.')

    const forged = Buffer.from(
      JSON.stringify({ sub: 'admin', exp: Math.floor(Date.now() / 1000) + 99999 })
    )
      .toString('base64url')
      .concat('.', signature)

    expect(await readSessionToken(forged)).toBeNull()
  })

  it('rejects an expired token', async () => {
    const token = await createSessionToken()
    const [body] = token.split('.')

    // Reuse the real signature over a payload whose expiry has passed. Even
    // if the signature checked out, the expiry must still be enforced.
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    payload.exp = Math.floor(Date.now() / 1000) - 60

    const stale = Buffer.from(JSON.stringify(payload)).toString('base64url')
    expect(await readSessionToken(`${stale}.${token.split('.')[1]}`)).toBeNull()
  })

  it.each([undefined, '', 'not-a-token', 'a.b', '....', 'eyJhIjoxfQ'])(
    'rejects %j',
    async value => {
      expect(await readSessionToken(value as string | undefined)).toBeNull()
    }
  )

  /**
   * Fails closed. A deployment that forgets AUTH_SECRET is locked out, not
   * laid open -- which is the opposite of what the previous gate did when its
   * localStorage flag was simply absent.
   */
  it('accepts nothing when no secret is configured', async () => {
    const token = await createSessionToken()
    delete process.env.AUTH_SECRET
    expect(await readSessionToken(token)).toBeNull()
  })

  it('reports itself unconfigured until both values are set', () => {
    expect(isAuthConfigured()).toBe(false)
    process.env.ADMIN_PASSWORD_HASH = 'scrypt:x:y'
    expect(isAuthConfigured()).toBe(true)
  })
})

describe('passwords', () => {
  it('accepts the right password', async () => {
    const stored = await hashPassword('a-real-password')
    expect(await verifyPassword('a-real-password', stored)).toBe(true)
  })

  it('rejects the wrong one', async () => {
    const stored = await hashPassword('a-real-password')
    expect(await verifyPassword('a-real-passworD', stored)).toBe(false)
    expect(await verifyPassword('', stored)).toBe(false)
  })

  it('never stores the password itself', async () => {
    const stored = await hashPassword('hunter2')
    expect(stored).not.toContain('hunter2')
  })

  it('salts, so the same password hashes differently every time', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'))
  })

  it.each(['', 'nonsense', 'bcrypt:x:y', 'scrypt:only-two-parts'])(
    'rejects a malformed stored hash %j',
    async stored => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      expect(await verifyPassword('anything', stored)).toBe(false)
    }
  )

  /**
   * The hash lives in .env.local, where Next expands `$name` as a variable
   * reference. A `$`-separated hash arrived as "scrypt+gG4qnfitEA===" -- two
   * of its three parts replaced with nothing -- and the only symptom was the
   * correct password being rejected. Nothing in the app could have told you
   * that; it took loading the env the way Next does and printing the result.
   */
  it('contains no character a .env file would eat', async () => {
    const stored = await hashPassword('anything')
    expect(stored).not.toContain('$')
    expect(stored.split(':')).toHaveLength(3)
  })

  it('survives a round trip through a .env file', async () => {
    const stored = await hashPassword('a-real-password')

    // What dotenv does to a value: read the line, take everything after the
    // first '=', expand any $name it finds.
    const line = `ADMIN_PASSWORD_HASH=${stored}`
    const value = line.slice(line.indexOf('=') + 1).replace(/\$[A-Za-z_][A-Za-z0-9_]*/g, '')

    expect(value).toBe(stored)
    expect(await verifyPassword('a-real-password', value)).toBe(true)
  })
})
