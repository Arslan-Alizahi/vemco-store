/**
 * Applies src/lib/db/schema.sql to whatever DATABASE_URL points at.
 *
 * The schema file is the one description of the tables -- the tests build
 * their scratch schema from it, and this puts the same thing on the real
 * database. Every statement in it is `CREATE TABLE IF NOT EXISTS`, `CREATE
 * INDEX IF NOT EXISTS` or `CREATE OR REPLACE FUNCTION`, so running it twice
 * changes nothing and running it after adding a table adds only that table.
 * There is no DROP and no DELETE in the file; that is a property worth
 * keeping, because this script points at production.
 *
 * Run with: node --env-file=.env.local scripts/db-migrate.mjs
 */
import postgres from 'postgres'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

const schema = readFileSync(join(process.cwd(), 'src/lib/db/schema.sql'), 'utf8')

/**
 * The session pooler, not the transaction pooler.
 *
 * DDL over Supavisor's transaction mode fails on anything that needs to hold
 * a session -- and the app's own connection string points at 6543 because
 * that is right for short web requests. Rewriting the port here means the
 * migration does not need its own environment variable that could drift out
 * of date.
 */
const sessionUrl = url.replace(':6543/', ':5432/')

const sql = postgres(sessionUrl, {
  prepare: false,
  fetch_types: false,
  max: 1,
  ssl: 'require',
  connect_timeout: 20,
})

try {
  console.log('Applying schema...')
  await sql.unsafe(schema)

  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name
  `
  console.log(`  ${tables.length} tables:`)
  console.log('  ' + tables.map(t => t.table_name).join(', '))
} catch (error) {
  console.error('Migration failed:', error.message)
  process.exitCode = 1
} finally {
  await sql.end()
}
