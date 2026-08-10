/**
 * Empties everything that represents trading, and nothing else.
 *
 * Run before the shop opens for real, to clear the sales, bookings, money and
 * customer records left over from testing. What it removes is every record of
 * something that happened; what it keeps is every record of something the
 * shop *has* -- the catalogue, the photographs, the navigation, the social
 * links. Those are setup, not history.
 *
 * A file rather than a shell one-liner on purpose. This is irreversible and
 * points at production, so it should be something that can be read and
 * reviewed before it is run, and it refuses to do anything without being
 * asked twice:
 *
 *   node --env-file=.env.local scripts/db-reset-trading.mjs          (dry run)
 *   node --env-file=.env.local scripts/db-reset-trading.mjs --yes    (deletes)
 *
 * There is no undo. Take a Supabase backup first if the data matters at all.
 */
import postgres from 'postgres'
import { createInterface } from 'node:readline/promises'

const CLEARED = [
  // Order matters: children before parents, so no foreign key ever refuses.
  // revenue_transactions first because the booking trigger writes into it.
  'revenue_transactions',
  'booking_payments',
  'booking_items',
  'bookings',
  'billing_items',
  'billing_receipts',
  'order_items',
  'orders',
  'enquiry_items',
  'enquiries',
  // Last. Bookings reference customers with ON DELETE RESTRICT, so the rows
  // above have to be gone before this one can be.
  'customers',
]

/** Left alone. The shop's setup, not its history. */
const KEPT = ['products', 'product_images', 'categories', 'nav_items', 'social_media_links', 'demo_seed']

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

const confirmed = process.argv.includes('--yes')

const sql = postgres(url.replace(':6543/', ':5432/'), {
  prepare: false,
  fetch_types: false,
  max: 1,
  ssl: 'require',
  connect_timeout: 20,
})

const count = async name => {
  const rows = await sql.unsafe(`SELECT count(*)::int AS n FROM ${name}`)
  return rows[0].n
}

try {
  console.log('\n  Will be deleted')
  let total = 0
  for (const table of CLEARED) {
    const n = await count(table)
    total += n
    console.log(`  ${String(n).padStart(6)}  ${table}`)
  }

  console.log('\n  Will be kept')
  for (const table of KEPT) {
    console.log(`  ${String(await count(table)).padStart(6)}  ${table}`)
  }

  if (!confirmed) {
    console.log(`\n  Dry run — nothing was deleted. ${total} rows would go.`)
    console.log('  Re-run with --yes to actually clear them.\n')
    process.exit(0)
  }

  // Asked twice, and the second time by hand. A flag can be left in a shell
  // history and re-run by accident; typing the word cannot.
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(`\n  Delete ${total} rows from the live database? Type DELETE to confirm: `)
  rl.close()

  if (answer.trim() !== 'DELETE') {
    console.log('\n  Cancelled. Nothing was deleted.\n')
    process.exit(0)
  }

  /**
   * One transaction. Half-cleared is worse than not cleared: a booking whose
   * payments were deleted but which survived itself would show as fully
   * unpaid, and the shop would chase a customer for money already taken.
   */
  await sql.begin(async tx => {
    for (const table of CLEARED) {
      await tx.unsafe(`DELETE FROM ${table}`)
      console.log(`  cleared ${table}`)
    }

    /**
     * Sequences restart, so the first real sale is #1.
     *
     * Cosmetic, but the alternative is a shop whose first genuine customer is
     * customer number 11 and whose first booking is booking 5 -- and somebody
     * will eventually ask where the other ten went.
     */
    for (const table of CLEARED) {
      await tx.unsafe(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'), 1, false)
         WHERE pg_get_serial_sequence('${table}', 'id') IS NOT NULL`
      )
    }
  })

  console.log('\n  Done. Remaining:')
  for (const table of [...CLEARED, ...KEPT]) {
    console.log(`  ${String(await count(table)).padStart(6)}  ${table}`)
  }
  console.log()
} catch (error) {
  console.error('\n  Reset failed:', error.message)
  process.exitCode = 1
} finally {
  await sql.end()
}
