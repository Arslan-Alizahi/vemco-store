/**
 * Clears counter sales and customers, and restores the stock they consumed.
 *
 * For clearing out what testing the till leaves behind. It deliberately does
 * not touch products, categories or online orders — only the rows a walk-in
 * sale creates.
 */

import Database from 'better-sqlite3'

const db = new Database(process.env.DATABASE_PATH || './data/ecommerce.db')

const receipts = db.prepare('SELECT id FROM billing_receipts').all()

const sold = db
  .prepare(
    'SELECT product_id, SUM(quantity) AS quantity FROM billing_items WHERE product_id IS NOT NULL GROUP BY product_id'
  )
  .all()

const clear = db.transaction(() => {
  for (const receipt of receipts) {
    db.prepare('DELETE FROM billing_items WHERE receipt_id = ?').run(receipt.id)
    try {
      db.prepare(
        "DELETE FROM revenue_transactions WHERE transaction_type = 'billing' AND reference_id = ?"
      ).run(receipt.id)
    } catch {
      // The revenue table may not exist on an older database.
    }
  }

  db.prepare('DELETE FROM billing_receipts').run()
  db.prepare('DELETE FROM customers').run()

  // Give back exactly what those sales took, rather than guessing at numbers.
  for (const line of sold) {
    db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?').run(
      line.quantity,
      line.product_id
    )
  }
})

clear()

console.log(
  `Cleared ${receipts.length} receipt(s) and every customer; returned stock for ${sold.length} product(s).`
)
