import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

/**
 * Password hashing, Node runtime only.
 *
 * scrypt from the standard library rather than bcrypt or argon2: those are
 * native modules, and this project already carries one (better-sqlite3) whose
 * rebuilds are the most common thing to go wrong on a fresh clone. scrypt is
 * a proper memory-hard KDF and it is already here.
 *
 * The parameters below are Node's defaults raised where it matters. N=2^15
 * with r=8 costs roughly 32MB and ~100ms per attempt, which is far too slow
 * to grind and unnoticeable on a login that happens once a shift.
 */
const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>

const PARAMS = { N: 32_768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }
const KEY_LENGTH = 32

/** `scrypt$<salt base64>$<hash base64>` */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = await scryptAsync(password, salt, KEY_LENGTH, PARAMS)
  return `scrypt$${salt.toString('base64')}$${derived.toString('base64')}`
}

/**
 * Constant-time comparison, so the time taken does not reveal how much of a
 * guess was right.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, saltPart, hashPart] = stored.split('$')
    if (scheme !== 'scrypt' || !saltPart || !hashPart) return false

    const salt = Buffer.from(saltPart, 'base64')
    const expected = Buffer.from(hashPart, 'base64')
    const derived = await scryptAsync(password, salt, expected.length, PARAMS)

    return derived.length === expected.length && timingSafeEqual(derived, expected)
  } catch {
    return false
  }
}
