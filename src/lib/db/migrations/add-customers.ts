import type { Database } from 'better-sqlite3'

/**
 * Brings an existing database up to the customers schema.
 *
 * schema.ts covers new installs; this covers every database created before
 * the counter learned who it was serving. Runs on every boot and does
 * nothing when the table and column are already there.
 */
export function addCustomers(db: Database): boolean {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        email TEXT,
        address TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
      CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
    `)

    const columns = new Set(
      (db.prepare('PRAGMA table_info(billing_receipts)').all() as Array<{ name: string }>).map(
        column => column.name
      )
    )

    // SQLite cannot add a column with a REFERENCES clause to an existing
    // table without rewriting it, and the value is only ever written by our
    // own code, so the column carries the relationship without the
    // constraint. New databases get the real foreign key from schema.ts.
    if (!columns.has('customer_id')) {
      db.prepare('ALTER TABLE billing_receipts ADD COLUMN customer_id INTEGER').run()
    }

    db.exec('CREATE INDEX IF NOT EXISTS idx_billing_customer ON billing_receipts(customer_id);')

    /**
     * Adopts receipts written before this existed.
     *
     * Sales already recorded a name and phone on the receipt itself; they
     * simply had nowhere to accumulate. Anyone who left a number becomes a
     * customer with their history intact, rather than starting from empty on
     * the day the feature shipped.
     */
    const orphans = db
      .prepare(
        `SELECT customer_phone AS phone, MAX(customer_name) AS name
         FROM billing_receipts
         WHERE customer_id IS NULL
           AND customer_phone IS NOT NULL AND TRIM(customer_phone) != ''
         GROUP BY customer_phone`
      )
      .all() as Array<{ phone: string; name: string | null }>

    const insert = db.prepare(
      `INSERT INTO customers (name, phone) VALUES (?, ?)
       ON CONFLICT(phone) DO UPDATE SET name = COALESCE(NULLIF(customers.name, ''), excluded.name)`
    )
    const link = db.prepare(
      `UPDATE billing_receipts SET customer_id = (SELECT id FROM customers WHERE phone = ?)
       WHERE customer_phone = ? AND customer_id IS NULL`
    )

    const adopt = db.transaction((rows: typeof orphans) => {
      for (const row of rows) {
        insert.run(row.name?.trim() || 'Counter customer', row.phone.trim())
        link.run(row.phone.trim(), row.phone)
      }
    })

    if (orphans.length > 0) {
      adopt(orphans)
      console.log(`Linked ${orphans.length} existing customer(s) to their past receipts`)
    }

    return true
  } catch (error) {
    console.error('Failed to add the customers table:', error)
    return false
  }
}
