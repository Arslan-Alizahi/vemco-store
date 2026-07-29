import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * A real SQLite file, not a mock.
 *
 * The bug these tests exist for was that the route trusted a number from the
 * request instead of reading one from the catalogue. A mocked database would
 * have been written to match whatever the route did and would have proved
 * nothing.
 */
const dir = mkdtempSync(join(tmpdir(), 'vemco-orders-'))
process.env.DATABASE_PATH = join(dir, 'test.db')

const { POST } = await import('./route')
const { getDb } = await import('@/lib/db')

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
const seedProduct = (overrides: { price?: number; stock?: number; active?: number } = {}) => {
  const db = getDb()
  db.prepare('DELETE FROM order_items').run()
  db.prepare('DELETE FROM orders').run()
  db.prepare('DELETE FROM products WHERE id = 9001').run()
  db.prepare(
    `INSERT INTO products (id, name, slug, sku, price, stock_quantity, category_id, is_active)
     VALUES (9001, 'Test Sofa', 'test-sofa', 'TST-001', ?, ?, 1, ?)`
  ).run(overrides.price ?? SOFA_PRICE, overrides.stock ?? 5, overrides.active ?? 1)
}

const customer = {
  customer_name: 'Arslan Khan',
  customer_email: 'arslan@vemco.pk',
  customer_phone: '03001234567',
  shipping_address: 'Showroom 14, Lahore',
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  seedProduct()
})

afterAll(() => {
  try {
    getDb().close()
  } catch {
    // Already closed.
  }
  rmSync(dir, { recursive: true, force: true })
})

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

    seedProduct({ price: 5_000 })
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
    seedProduct({ stock: 2 })
    const { status, body } = await post({ ...customer, items: [{ product_id: 9001, quantity: 3 }] })

    expect(status).toBe(409)
    expect(body.message).toMatch(/only have 2/i)
  })

  it('reduces the stock by what was ordered', async () => {
    seedProduct({ stock: 5 })
    await post({ ...customer, items: [{ product_id: 9001, quantity: 2 }] })

    const product = getDb()
      .prepare('SELECT stock_quantity FROM products WHERE id = 9001')
      .get() as { stock_quantity: number }
    expect(product.stock_quantity).toBe(3)
  })

  it('adds up two lines of the same product before checking stock', async () => {
    seedProduct({ stock: 3 })
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
    seedProduct({ stock: 2 })
    await post({ ...customer, items: [{ product_id: 9001, quantity: 3 }] })

    const product = getDb()
      .prepare('SELECT stock_quantity FROM products WHERE id = 9001')
      .get() as { stock_quantity: number }
    expect(product.stock_quantity).toBe(2)
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
    seedProduct({ active: 0 })
    const { status } = await post({ ...customer, items: [{ product_id: 9001, quantity: 1 }] })
    expect(status).toBe(400)
  })

  it.each([0, -1, 1.5, 1000, 'two'])('refuses a quantity of %j', async quantity => {
    const { status } = await post({ ...customer, items: [{ product_id: 9001, quantity }] })
    expect(status).toBe(400)
  })

  it('creates no order when it refuses one', async () => {
    await post({ ...customer, items: [{ product_id: 424242, quantity: 1 }] })
    const count = getDb().prepare('SELECT COUNT(*) AS c FROM orders').get() as { c: number }
    expect(count.c).toBe(0)
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
