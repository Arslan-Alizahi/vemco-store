import { NextRequest, NextResponse } from 'next/server'
import { clientKey, createRateLimiter } from '@/lib/rate-limit'
import { verifyPassword } from '@/lib/auth/password'
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  isAuthConfigured,
} from '@/lib/auth/session'

// scrypt needs node:crypto, which the Edge runtime does not have.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Eight guesses a quarter of an hour, per address. See lib/rate-limit. */
const loginLimit = createRateLimiter({ max: 8, windowMs: 15 * 60 * 1000 })

export async function POST(request: NextRequest) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      {
        success: false,
        message:
          'Admin access is not configured. Run `npm run admin:password` and put the two values it prints into .env.local.',
      },
      { status: 503 }
    )
  }

  const key = clientKey(request)
  if (loginLimit.exceeded(key)) {
    return NextResponse.json(
      { success: false, message: 'Too many attempts. Try again in a few minutes.' },
      { status: 429 }
    )
  }

  let password: unknown
  try {
    password = (await request.json())?.password
  } catch {
    password = undefined
  }

  if (typeof password !== 'string' || password.length === 0) {
    return NextResponse.json({ success: false, message: 'Enter the password' }, { status: 400 })
  }

  const correct = await verifyPassword(password, process.env.ADMIN_PASSWORD_HASH!)
  if (!correct) {
    // Deliberately vague, and identical whatever went wrong.
    return NextResponse.json(
      { success: false, message: 'That password does not match' },
      { status: 401 }
    )
  }

  loginLimit.clear(key)

  const response = NextResponse.json({ success: true })
  response.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    // Unreadable to JavaScript, so an XSS bug cannot lift the session the way
    // it could lift the old localStorage flag.
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })

  return response
}

/** Sign out. */
export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return response
}
