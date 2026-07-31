/**
 * Writes fresh admin credentials straight into .env.local.
 *
 * A convenience over copying two lines by hand, but it exists mostly because
 * getting one character wrong here produces the least helpful failure in the
 * app: a correct password rejected with "that password does not match".
 *
 *   node scripts/set-admin-env.mjs "my-password"
 */

import { randomBytes, scrypt } from 'node:crypto'
import { promisify } from 'node:util'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const scryptAsync = promisify(scrypt)
const PARAMS = { N: 32_768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }
const ENV_FILE = join(process.cwd(), '.env.local')

const password = process.argv[2] || randomBytes(12).toString('base64url')

const salt = randomBytes(16)
const derived = await scryptAsync(password, salt, 32, PARAMS)

// Colon separated. `$` is a variable reference inside a .env file and Next
// expands it, which silently ate two thirds of the hash the first time.
const hash = `scrypt:${salt.toString('base64')}:${derived.toString('base64')}`
const secret = randomBytes(32).toString('base64')

const upsert = (source, key, value) => {
  const line = `${key}=${value}`
  return new RegExp(`^${key}=.*$`, 'm').test(source)
    ? source.replace(new RegExp(`^${key}=.*$`, 'm'), line)
    : `${source.trimEnd()}\n${line}\n`
}

let env = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8') : ''
env = upsert(env, 'AUTH_SECRET', secret)
env = upsert(env, 'ADMIN_PASSWORD_HASH', hash)
writeFileSync(ENV_FILE, env)

console.log('\n.env.local updated.\n')
console.log(`  Sign in at /admin with: ${password}\n`)
console.log('  Restart the server to pick it up. Changing AUTH_SECRET signs everyone out.\n')
