import { describe, expect, it } from 'vitest'
import { toPositional } from './placeholders'

/**
 * Every query in the application goes through this on its way to Postgres.
 *
 * It exists so that 315 hand-written statements did not have to be edited
 * during the move off SQLite, which means a fault here is a fault in all of
 * them at once -- and the shape of the failure would be a value landing in
 * the wrong column rather than an error.
 */
describe('placeholders become $1, $2, …', () => {
  it('numbers them in order', () => {
    expect(toPositional('SELECT * FROM products WHERE id = ? AND slug = ?')).toBe(
      'SELECT * FROM products WHERE id = $1 AND slug = $2'
    )
  })

  it('keeps counting past nine', () => {
    const values = Array.from({ length: 12 }, () => '?').join(', ')
    expect(toPositional(`INSERT INTO t VALUES (${values})`)).toContain('$10, $11, $12')
  })

  it('leaves a query with no placeholders alone', () => {
    const sql = 'SELECT COUNT(*) FROM orders'
    expect(toPositional(sql)).toBe(sql)
  })
})

/**
 * A `?` is only a placeholder where SQL would read it as one. These are the
 * cases where a regular expression over the whole string would corrupt the
 * statement.
 */
describe('what is not a placeholder', () => {
  it('ignores one inside a string literal', () => {
    expect(toPositional("SELECT * FROM t WHERE notes = '?' AND id = ?")).toBe(
      "SELECT * FROM t WHERE notes = '?' AND id = $1"
    )
  })

  it('ignores one inside an escaped quote', () => {
    expect(toPositional("SELECT 'it''s a ? really' , ?")).toBe(
      "SELECT 'it''s a ? really' , $1"
    )
  })

  it('ignores one inside a quoted identifier', () => {
    expect(toPositional('SELECT total AS "how much?" FROM t WHERE id = ?')).toBe(
      'SELECT total AS "how much?" FROM t WHERE id = $1'
    )
  })

  it('ignores one inside a line comment', () => {
    expect(toPositional('SELECT 1 -- why? because\nWHERE id = ?')).toBe(
      'SELECT 1 -- why? because\nWHERE id = $1'
    )
  })

  it('ignores one inside a block comment', () => {
    expect(toPositional('SELECT 1 /* really? yes */ WHERE id = ?')).toBe(
      'SELECT 1 /* really? yes */ WHERE id = $1'
    )
  })

  it('resumes numbering after a comment', () => {
    expect(toPositional('WHERE a = ? -- ?\nAND b = ?')).toBe('WHERE a = $1 -- ?\nAND b = $2')
  })
})

/**
 * The real statements this was written for, so a change to the scanner has to
 * survive the SQL the application actually sends.
 */
describe('statements from the application', () => {
  it('handles the customer upsert', () => {
    const sql = `INSERT INTO customers (name, phone, email, address)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(phone) DO UPDATE SET
       name = excluded.name,
       email = COALESCE(excluded.email, customers.email),
       updated_at = NOW()
     RETURNING *`

    const converted = toPositional(sql)
    expect(converted).toContain('VALUES ($1, $2, $3, $4)')
    expect(converted).not.toContain('?')
  })

  it('handles a multi-line insert with a trailing comment', () => {
    const sql = `
      -- who bought it, and what for?
      INSERT INTO order_items (order_id, product_name, quantity)
      VALUES (?, ?, ?)
    `
    expect(toPositional(sql)).toContain('VALUES ($1, $2, $3)')
  })
})
