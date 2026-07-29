import { NextRequest, NextResponse } from 'next/server'
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

/**
 * Attempts per address, in memory.
 *
 * Honest about what it is: this resets when the process restarts and does not
 * span instances. For a single-node shop on SQLite that is the whole
 * deployment, so it holds. Behind more than one instance it would need to
 * move into the database, and that is a change to make deliberately rather
 * than to assume.
 */
const attempts = new Map<string, { count: number; firstAt: number }>()
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 8

const clientKey = (request: NextRequest): string =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
  request.headers.get('x-real-ip') ||
  'unknown'

const rateLimited = (key: string): boolean => {
  const now = Date.now()
  const record = attempts.get(key)

  if (!record || now - record.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now })
    return false
  }

  record.count += 1
  return record.count > MAX_ATTEMPTS
}

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
  if (rateLimited(key)) {
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

  attempts.delete(key)

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
