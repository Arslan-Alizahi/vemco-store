import type { NextRequest } from 'next/server'

/**
 * A fixed-window rate limiter, in this process's memory.
 *
 * Honest about what it is: it resets when the process restarts and does not
 * span instances. For a single-node shop that is the whole deployment, so it
 * holds. Behind more than one instance it would need to move into the
 * database, and that is a change to make deliberately rather than to assume.
 *
 * It exists because two routes are open to the public without a session --
 * the admin login, where the risk is somebody guessing the password, and the
 * enquiry form, where the risk is quieter but worse: a bot filling it all
 * night would bury real customers in the shop's list, and burn through the
 * Gmail sending quota so that the *genuine* confirmations stop arriving.
 */

export interface RateLimit {
  /** How many requests are allowed inside the window. */
  max: number
  /** The window, in milliseconds. */
  windowMs: number
}

interface Record {
  count: number
  firstAt: number
}

/**
 * One bucket per limiter, keyed by caller.
 *
 * Swept rather than left to grow: every distinct address that ever hits a
 * limited route would otherwise stay in memory for the life of the process,
 * which on a public form is every crawler on the internet.
 */
export function createRateLimiter({ max, windowMs }: RateLimit) {
  const seen = new Map<string, Record>()
  let lastSweep = 0

  const sweep = (now: number) => {
    // At most once a window; walking the map on every request would make the
    // limiter itself the expensive part of a cheap route.
    if (now - lastSweep < windowMs) return
    lastSweep = now
    for (const [key, record] of seen) {
      if (now - record.firstAt > windowMs) seen.delete(key)
    }
  }

  return {
    /** True when this caller has had its allowance. */
    exceeded(key: string, now = Date.now()): boolean {
      sweep(now)

      const record = seen.get(key)
      if (!record || now - record.firstAt > windowMs) {
        seen.set(key, { count: 1, firstAt: now })
        return false
      }

      record.count += 1
      return record.count > max
    },

    /** Whole minutes until this caller may try again. Never below one. */
    retryAfterMinutes(key: string, now = Date.now()): number {
      const record = seen.get(key)
      if (!record) return 1
      return Math.max(1, Math.ceil((record.firstAt + windowMs - now) / 60_000))
    },

    /**
     * Forget one caller.
     *
     * The login route calls this on a correct password: somebody who mistyped
     * twice and then got it right should not still be two guesses from being
     * locked out for a quarter of an hour.
     */
    clear(key: string) {
      seen.delete(key)
    },

    /** Testing only: forget everything. */
    reset() {
      seen.clear()
      lastSweep = 0
    },
  }
}

/**
 * Who is calling, as well as can be known behind a proxy.
 *
 * `x-forwarded-for` is a list appended to by each hop, so the first entry is
 * the original client. It is trivially spoofable by the client itself, which
 * is why this is a courtesy limit on volume and not a security control -- the
 * things that actually matter (the password check, the session cookie) do not
 * rely on it.
 */
export const clientKey = (request: NextRequest): string =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
  request.headers.get('x-real-ip') ||
  'unknown'
