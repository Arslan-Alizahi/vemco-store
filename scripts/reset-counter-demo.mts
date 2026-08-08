/**
 * Clears counter sales and customers, and restores the stock they consumed.
 *
 * For clearing out what testing the till leaves behind. It deliberately does
 * not touch products, categories or online orders -- only the rows a walk-in
 * sale creates.
 *
 *   npm run reset:counter
 */
import { config } from 'dotenv'
import { runQuery, runTransaction, runUpdate, closeDb } from '../src/lib/db/index'

config({ path: '.env.local' })
config({ path: '.env' })

const run = async () => {
  const [receipts, sold] = await Promise.all([
    runQuery<{ id: number }>('SELECT id FROM billing_receipts'),
    runQuery<{ product_id: number; quantity: number }>(
      `SELECT product_id, SUM(quantity) AS quantity
       FROM billing_items
       WHERE product_id IS NOT NULL
       GROUP BY product_id`
    ),
  ])

  await runTransaction(async tx => {
    /**
     * Set-based, not row-by-row.
     *
     * The SQLite version looped over every receipt issuing two statements
     * each, which cost nothing against a local file. Over a network it is two
     * round trips per receipt, and the whole point of the operation is that
     * there may be a lot of them.
     */
    await runUpdate(
      'DELETE FROM billing_items WHERE receipt_id IN (SELECT id FROM billing_receipts)',
      [],
      tx
    )
    await runUpdate(
      `DELETE FROM revenue_transactions
       WHERE transaction_type = 'billing'
         AND reference_id IN (SELECT id FROM billing_receipts)`,
      [],
      tx
    )

    await runUpdate('DELETE FROM billing_receipts', [], tx)
    await runUpdate('DELETE FROM customers', [], tx)

    // Give back exactly what those sales took, rather than guessing.
    for (const line of sold) {
      await runUpdate(
        'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
        [line.quantity, line.product_id],
        tx
      )
    }
  })

  console.log(
    `Cleared ${receipts.length} receipt(s) and every customer; returned stock for ${sold.length} product(s).`
  )
}

run()
  .catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(closeDb)
