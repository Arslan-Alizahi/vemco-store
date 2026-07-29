/**
 * Signed session tokens.
 *
 * Built on Web Crypto rather than node:crypto because middleware runs on the
 * Edge runtime, where node:crypto is not available. The same code therefore
 * works in both places: middleware verifies, the login route signs.
 *
 * This is deliberately not a JWT library. The whole requirement is "a value
 * the server can hand out and later recognise as its own", which is one HMAC.
 */

export const SESSION_COOKIE = 'vemco_admin'

/** Eight hours: a working day, so an operator is not logged out mid-shift. */
export const SESSION_TTL_SECONDS = 8 * 60 * 60

interface SessionPayload {
  /** Who. There is one operator, so this is a constant, but naming it keeps
   *  the door open for more without changing the token shape. */
  sub: string
  /** Unix seconds. */
  exp: number
}

const encoder = new TextEncoder()

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Built on an explicit ArrayBuffer rather than via Uint8Array.from, because
// crypto.subtle takes a BufferSource and TypeScript 5.7 will not accept the
// ArrayBufferLike-backed view that Uint8Array.from infers.
const fromBase64Url = (value: string): Uint8Array<ArrayBuffer> => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))

  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

/**
 * The signing key.
 *
 * Absent means no sessions can be issued or verified, which fails closed:
 * every protected route rejects rather than admitting everyone. A deployment
 * that forgets this is locked out, not laid open.
 */
const getSecret = (): string | null => process.env.AUTH_SECRET || null

const importKey = (secret: string) =>
  crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ])

export async function createSessionToken(subject = 'admin'): Promise<string> {
  const secret = getSecret()
  if (!secret) throw new Error('AUTH_SECRET is not set')

  const payload: SessionPayload = {
    sub: subject,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  }

  const body = toBase64Url(encoder.encode(JSON.stringify(payload)))
  const key = await importKey(secret)
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(body)))

  return `${body}.${toBase64Url(signature)}`
}

/**
 * Returns the payload if the token is genuine and current, otherwise null.
 *
 * Verification comes before parsing, and crypto.subtle.verify compares in
 * constant time, so neither the contents nor the timing tell an attacker how
 * close a forgery was.
 */
export async function readSessionToken(token: string | undefined): Promise<SessionPayload | null> {
  const secret = getSecret()
  if (!secret || !token) return null

  const [body, signature] = token.split('.')
  if (!body || !signature) return null

  try {
    const key = await importKey(secret)
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      fromBase64Url(signature),
      encoder.encode(body)
    )
    if (!valid) return null

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as SessionPayload
    if (typeof payload?.exp !== 'number' || payload.exp * 1000 <= Date.now()) return null

    return payload
  } catch {
    // Malformed base64, malformed JSON, wrong key length -- all of it is just
    // "not a token we issued".
    return null
  }
}

export const isAuthConfigured = (): boolean =>
  Boolean(process.env.AUTH_SECRET && process.env.ADMIN_PASSWORD_HASH)
