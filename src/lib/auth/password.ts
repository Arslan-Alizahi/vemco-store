import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

/**
 * Password hashing, Node runtime only.
 *
 * scrypt from the standard library rather than bcrypt or argon2: those are
 * native modules, and this project used to carry one (better-sqlite3) whose
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

/**
 * `scrypt:<salt base64>:<hash base64>`
 *
 * Colon, not the `$` the format usually uses, because this value lives in
 * .env.local and Next expands `$name` there as a variable reference. A hash
 * written with `$` separators arrived as "scrypt+gG4qnfitEA===" -- two of its
 * three parts silently replaced with nothing -- and the only symptom was that
 * the correct password was rejected. Base64 never contains a colon, so this
 * cannot collide.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = await scryptAsync(password, salt, KEY_LENGTH, PARAMS)
  return `scrypt:${salt.toString('base64')}:${derived.toString('base64')}`
}

/**
 * Constant-time comparison, so the time taken does not reveal how much of a
 * guess was right.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, saltPart, hashPart] = stored.split(':')

    if (scheme !== 'scrypt' || !saltPart || !hashPart) {
      /**
       * Says so, rather than reporting it as a wrong password.
       *
       * A malformed hash and a bad guess were indistinguishable, which is how
       * a mangled .env value cost an afternoon: the screen said the password
       * did not match, and the password was correct.
       */
      console.error(
        'ADMIN_PASSWORD_HASH is not a valid scrypt hash. Expected scrypt:<salt>:<hash>. ' +
          'Regenerate it with `npm run admin:password`.'
      )
      return false
    }

    const salt = Buffer.from(saltPart, 'base64')
    const expected = Buffer.from(hashPart, 'base64')
    const derived = await scryptAsync(password, salt, expected.length, PARAMS)

    return derived.length === expected.length && timingSafeEqual(derived, expected)
  } catch {
    return false
  }
}
