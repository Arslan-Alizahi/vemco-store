import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { config } from 'dotenv'

/**
 * A real Postgres, not a mock.
 *
 * The bug these tests exist for was that the route trusted a number from the
 * request instead of reading one from the catalogue. A mocked database would
 * have been written to match whatever the route did and would have proved
 * nothing.
 *
 * They used to run against a temporary SQLite file. There is no such thing
 * now, so they build a scratch schema in the same Postgres the application
 * uses, apply the real DDL to it, and drop it at the end. Same server, same
 * driver, same triggers, same NUMERIC handling -- and `DELETE FROM orders`
 * inside it cannot touch the shop's actual orders, which is the part that
 * matters when the test database and the live one are the same instance.
 */
config({ path: '.env.local' })
config({ path: '.env' })

const SCHEMA = `vimco_test_${process.pid}`
process.env.DATABASE_SCHEMA = SCHEMA

/**
 * Session mode for the tests, transaction mode for the application.
 *
 * search_path is a session setting, and the transaction pooler hands out a
 * different backend per transaction -- so a schema chosen at connect time is
 * not reliably the schema the next statement runs in. Port 5432 keeps one
 * backend for the life of the connection, which is what these tests need and
 * what a serverless deployment must not ask for.
 */
if (process.env.DATABASE_URL?.includes(':6543')) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(':6543', ':5432')
}

const { POST } = await import('./route')
const { closeDb, getDb, runGet, runQuery, runUpdate } = await import('@/lib/db')

const SOFA_PRICE = 185_000

const post = async (body: unknown) => {
  const request = new Request('http://localhost/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const response = await POST(request as never)
  return { status: response.status, body: await response.json() }
}

/** A known product, so the expected total is not guesswork. */
const seedProduct = async (
  overrides: { price?: number; stock?: number; active?: number } = {}
) => {
  await runUpdate('DELETE FROM order_items')
  await runUpdate('DELETE FROM orders')
  await runUpdate('DELETE FROM products WHERE id = 9001')
  await runUpdate(
    `INSERT INTO products (id, name, slug, sku, price, stock_quantity, category_id, is_active)
     VALUES (9001, 'Test Sofa', 'test-sofa', 'TST-001', ?, ?, NULL, ?)`,
    [overrides.price ?? SOFA_PRICE, overrides.stock ?? 5, overrides.active ?? 1]
  )
}

const customer = {
  customer_name: 'Arslan Khan',
  customer_email: 'hj680787@gmail.com',
  customer_phone: '03001234567',
  shipping_address: 'Showroom 14, Lahore',
}

beforeAll(async () => {
  const db = getDb()
  // CREATE SCHEMA needs no search_path; everything after it lands inside the
  // new schema because search_path already points there.
  await db.unsafe(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`)
  await db.unsafe(readFileSync(join(process.cwd(), 'src/lib/db/schema.sql'), 'utf8'))
}, 60_000)

beforeEach(async () => {
  // Set DEBUG_ORDERS=1 to see what a 500 actually was.
  if (!process.env.DEBUG_ORDERS) vi.spyOn(console, 'error').mockImplementation(() => {})
  await seedProduct()
})

afterAll(async () => {
  try {
    await getDb().unsafe(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`)
  } finally {
    await closeDb()
  }
}, 60_000)

describe('the price comes from the catalogue', () => {
  it('ignores a unit_price sent by the customer', async () => {
    const { status, body } = await post({
      ...customer,
      items: [{ product_id: 9001, quantity: 1, unit_price: 1 }],
    })

    expect(status).toBe(201)
    expect(body.data.subtotal).toBe(SOFA_PRICE)
    expect(body.data.items[0].unit_price).toBe(SOFA_PRICE)
  })

  it('ignores a total, tax and shipping sent by the customer', async () => {
    const { body } = await post({
      ...customer,
      subtotal: 1,
      tax: 0,
      shipping_cost: 0,
      discount: 999_999,
      total: 1,
      items: [{ product_id: 9001, quantity: 1 }],
    })

    expect(body.data.subtotal).toBe(SOFA_PRICE)
    expect(body.data.discount).toBe(0)
    expect(body.data.total).toBeGreaterThan(SOFA_PRICE)
  })

  it('bills the quantity ordered', async () => {
    const { body } = await post({ ...customer, items: [{ product_id: 9001, quantity: 3 }] })
    expect(body.data.subtotal).toBe(SOFA_PRICE * 3)
  })

  it('applies free delivery above the threshold and charges it below', async () => {
    const above = await post({ ...customer, items: [{ product_id: 9001, quantity: 1 }] })
    expect(above.body.data.shipping_cost).toBe(0)

    await seedProduct({ price: 5_000 })
    const below = await post({ ...customer, items: [{ product_id: 9001, quantity: 1 }] })
    expect(below.body.data.shipping_cost).toBe(2_500)
  })

  it('adds up to subtotal plus tax plus delivery', async () => {
    const { body } = await post({ ...customer, items: [{ product_id: 9001, quantity: 1 }] })
    const { subtotal, tax, shipping_cost, total } = body.data
    expect(total).toBeCloseTo(subtotal + tax + shipping_cost, 2)
  })
})

describe('stock', () => {
  it('refuses an order larger than the stock on hand', async () => {
    await seedProduct({ stock: 2 })
    const { status, body } = await post({ ...customer, items: [{ product_id: 9001, quantity: 3 }] })

    expect(status).toBe(409)
    expect(body.message).toMatch(/only have 2/i)
  })

  it('reduces the stock by what was ordered', async () => {
    await seedProduct({ stock: 5 })
    await post({ ...customer, items: [{ product_id: 9001, quantity: 2 }] })

    const product = await runGet<{ stock_quantity: number }>(
      'SELECT stock_quantity FROM products WHERE id = 9001'
    )
    expect(product?.stock_quantity).toBe(3)
  })

  it('adds up two lines of the same product before checking stock', async () => {
    await seedProduct({ stock: 3 })
    const { status } = await post({
      ...customer,
      items: [
        { product_id: 9001, quantity: 2 },
        { product_id: 9001, quantity: 2 },
      ],
    })

    // Four requested against three in stock. Checked per line, both would pass.
    expect(status).toBe(409)
  })

  it('leaves the stock alone when the order is refused', async () => {
    await seedProduct({ stock: 2 })
    await post({ ...customer, items: [{ product_id: 9001, quantity: 3 }] })

    const product = await runGet<{ stock_quantity: number }>(
      'SELECT stock_quantity FROM products WHERE id = 9001'
    )
    expect(product?.stock_quantity).toBe(2)
  })
})

describe('what it refuses', () => {
  it('refuses an empty order', async () => {
    const { status } = await post({ ...customer, items: [] })
    expect(status).toBe(400)
  })

  it('refuses a product that does not exist', async () => {
    const { status } = await post({ ...customer, items: [{ product_id: 424242, quantity: 1 }] })
    expect(status).toBe(400)
  })

  it('refuses a product that has been withdrawn', async () => {
    await seedProduct({ active: 0 })
    const { status } = await post({ ...customer, items: [{ product_id: 9001, quantity: 1 }] })
    expect(status).toBe(400)
  })

  it.each([0, -1, 1.5, 1000, 'two'])('refuses a quantity of %j', async quantity => {
    const { status } = await post({ ...customer, items: [{ product_id: 9001, quantity }] })
    expect(status).toBe(400)
  })

  it('creates no order when it refuses one', async () => {
    await post({ ...customer, items: [{ product_id: 424242, quantity: 1 }] })
    const rows = await runQuery<{ c: number }>('SELECT COUNT(*) AS c FROM orders')
    expect(rows[0].c).toBe(0)
  })
})

describe('the order as recorded', () => {
  it('starts unpaid', async () => {
    const { body } = await post({ ...customer, items: [{ product_id: 9001, quantity: 1 }] })
    expect(body.data.payment_status).toBe('pending')
  })

  it('takes the product name from the catalogue, not the request', async () => {
    const { body } = await post({
      ...customer,
      items: [{ product_id: 9001, quantity: 1, product_name: 'Free Sofa' }],
    })
    expect(body.data.items[0].product_name).toBe('Test Sofa')
  })
})
