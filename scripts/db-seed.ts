/**
 * Puts the demo catalogue into the database.
 *
 *   npm run db:seed     -- add it if it is not there
 *   npm run db:seed -- --clear   -- take it out again
 *
 * Idempotent in both directions. The seeder records every row it creates in
 * the `demo_seed` ledger, so clearing removes exactly those rows and never
 * touches a product the shop added itself.
 */
import { config } from 'dotenv'
import { clearDemoData, hasDemoData, seedDemoData } from '../src/lib/db/seed'
import { closeDb } from '../src/lib/db/index'

// .env.local first: it holds the real connection string and should win over
// anything committed in .env.
config({ path: '.env.local' })
config({ path: '.env' })

const run = async () => {
  if (process.argv.includes('--clear')) {
    const removed = await clearDemoData()
    const total = Object.values(removed).reduce((sum, count) => sum + count, 0)
    console.log(`Removed ${total} demo rows:`, removed)
    return
  }

  if (await hasDemoData()) {
    console.log('Demo data is already present. Nothing to do.')
    console.log('Run with --clear first if you want to reseed.')
    return
  }

  const { seeded, products } = await seedDemoData()
  console.log(seeded ? `Seeded ${products} products.` : 'Already seeded.')
}

run()
  .catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(closeDb)
