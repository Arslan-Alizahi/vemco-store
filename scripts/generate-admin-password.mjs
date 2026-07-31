/**
 * Prints the two values admin access needs.
 *
 * There is deliberately no default password anywhere in this codebase. The
 * previous gate shipped `admin123` as a literal in a client bundle, and a
 * default credential is the kind of thing that survives all the way to
 * production because nothing ever forces anyone to change it. Unset means
 * locked, and this is the one step that unlocks it.
 *
 *   npm run admin:password              a password is generated for you
 *   npm run admin:password -- "mine"    or use your own
 */

import { randomBytes, scrypt } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)
const PARAMS = { N: 32_768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }

const supplied = process.argv[2]
const password = supplied || randomBytes(12).toString('base64url')

const salt = randomBytes(16)
const derived = await scryptAsync(password, salt, 32, PARAMS)
const hash = `scrypt:${salt.toString('base64')}:${derived.toString('base64')}`
const secret = randomBytes(32).toString('base64')

console.log('\nAdd these two lines to .env.local:\n')
console.log(`AUTH_SECRET=${secret}`)
console.log(`ADMIN_PASSWORD_HASH=${hash}`)
console.log(`\nSign in with: ${password}`)

if (!supplied) {
  console.log('(generated — nothing else will show it to you again)')
}

console.log(
  '\nThe password itself is never stored. Changing AUTH_SECRET signs everyone out immediately.\n'
)
