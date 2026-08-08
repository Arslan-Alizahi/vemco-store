/**
 * Says whether the database is reachable, and from where.
 *
 * Supabase offers three ways in and they fail differently: the transaction
 * pooler on 6543, the session pooler on 5432, and a direct connection to the
 * instance. A deployment that works locally and times out in production is
 * almost always the wrong one of those three, so this prints which are
 * actually answering rather than leaving it to be discovered later.
 *
 *   npm run db:check
 */
import postgres from 'postgres'
import { readFileSync } from 'fs'

/**
 * Read .env.local ourselves. Next loads it; a bare node script does not, and
 * pasting the connection string on the command line would put a password in
 * the shell history.
 */
const loadEnv = () => {
  for (const file of ['.env.local', '.env']) {
    try {
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i)
        if (match && !process.env[match[1]]) {
          process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
        }
      }
    } catch {
      // Absent is fine; the host may set the variable directly.
    }
  }
}

loadEnv()

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set. Add it to .env.local.')
  process.exit(1)
}

/** Never print the password, even in an error. */
const redact = string => string.replace(/:\/\/([^:]+):[^@]+@/, '://$1:****@')

const variants = [
  ['configured  ', url],
  ['pooler aws-1', url.replace('aws-0-', 'aws-1-')],
  ['session 5432', url.replace(':6543', ':5432')],
]

let anyWorked = false

for (const [label, candidate] of variants) {
  if (label !== 'configured  ' && candidate === url) continue

  const sql = postgres(candidate, { prepare: false, max: 1, ssl: 'require', connect_timeout: 10 })
  try {
    const [row] = await sql`
      select current_user as who,
             current_database() as db,
             (select count(*) from information_schema.tables
               where table_schema = 'public') as tables
    `
    anyWorked = true
    console.log(`OK    ${label}  user=${row.who} db=${row.db} tables=${row.tables}`)
    console.log(`      ${redact(candidate)}`)
  } catch (error) {
    console.log(`FAIL  ${label}  ${error.code || String(error.message).slice(0, 60)}`)
  } finally {
    await sql.end({ timeout: 2 }).catch(() => {})
  }
}

process.exit(anyWorked ? 0 : 1)
