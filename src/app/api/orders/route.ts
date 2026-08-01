import { NextRequest, NextResponse } from 'next/server'
import { getDb, runQuery, runTransaction } from '@/lib/db'
import { Order } from '@/types/order'
import { apiResponse, apiError, generateOrderNumber, calculateTax, calculateTotal } from '@/lib/utils'
import { FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING } from '@/lib/shipping'
import { normalisePhone } from '@/lib/customers'

/**
 * Never evaluated at build time.
 *
 * Next collects page data by importing every route and deciding whether the
 * handler is static, which means running it. Any route that opens the
 * database therefore ran during `next build` -- quietly creating and seeding
 * a file, and failing outright on a build that has no database to open.
 */
export const dynamic = 'force-dynamic'

// GET /api/orders - Get all orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    let sql = `
      SELECT * FROM orders
      WHERE 1=1
    `
    const params: any[] = []

    if (searchParams.get('status')) {
      sql += ' AND status = ?'
      params.push(searchParams.get('status'))
    }

    if (searchParams.get('customer_email')) {
      sql += ' AND customer_email = ?'
      params.push(searchParams.get('customer_email'))
    }

    sql += ' ORDER BY created_at DESC'

    if (searchParams.get('limit')) {
      sql += ' LIMIT ?'
      params.push(parseInt(searchParams.get('limit')!))
    }

    const orders = runQuery<Order>(sql, params)

    // Get order items for each order
    const ordersWithItems = orders.map(order => {
      const items = runQuery<any>(
        'SELECT * FROM order_items WHERE order_id = ?',
        [order.id]
      )
      return { ...order, items }
    })

    return NextResponse.json(apiResponse(ordersWithItems))
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      apiError('Failed to fetch orders'),
      { status: 500 }
    )
  }
}

/**
 * What the client is allowed to say about an item: which product, how many.
 *
 * Everything else -- price, name, SKU, image, the line subtotal, the order
 * total -- is read from the database. This route used to take `unit_price`
 * straight off the request and multiply it out, so posting
 * `{"product_id":1,"quantity":1,"unit_price":1}` for a Rs 185,000 sofa
 * produced an order with a total of Rs 1.18, and the payment link was
 * generated from that total. Anyone who could open the developer tools could
 * name their own price.
 */
interface RequestedItem {
  product_id: number
  quantity: number
}

const parseItems = (raw: unknown): RequestedItem[] => {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw Object.assign(new Error('An order needs at least one item'), { status: 400 })
  }

  return raw.map(entry => {
    const productId = Number((entry as any)?.product_id)
    const quantity = Number((entry as any)?.quantity)

    if (!Number.isInteger(productId) || productId <= 0) {
      throw Object.assign(new Error('An item is missing a valid product'), { status: 400 })
    }
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 999) {
      throw Object.assign(new Error('An item has an invalid quantity'), { status: 400 })
    }

    return { product_id: productId, quantity }
  })
}

// POST /api/orders - Create new order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const db = getDb()

    const requested = parseItems(body.items)

    // Two lines for the same product would each pass the stock check on their
    // own and together take more than there is.
    const merged = new Map<number, number>()
    for (const item of requested) {
      merged.set(item.product_id, (merged.get(item.product_id) ?? 0) + item.quantity)
    }

    return runTransaction(db => {
      const findProduct = db.prepare(
        'SELECT id, name, sku, price, stock_quantity, is_active FROM products WHERE id = ?'
      )
      const findImage = db.prepare(
        `SELECT image_url FROM product_images
         WHERE product_id = ? ORDER BY is_primary DESC, display_order ASC LIMIT 1`
      )

      const lines = Array.from(merged.entries()).map(([productId, quantity]) => {
        const product = findProduct.get(productId) as
          | { id: number; name: string; sku: string; price: number; stock_quantity: number; is_active: number }
          | undefined

        if (!product || !product.is_active) {
          throw Object.assign(new Error('One of those pieces is no longer available'), {
            status: 400,
          })
        }
        if (product.stock_quantity < quantity) {
          throw Object.assign(
            new Error(
              `We only have ${product.stock_quantity} of ${product.name} left`
            ),
            { status: 409 }
          )
        }

        const image = findImage.get(productId) as { image_url: string } | undefined

        return {
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
          product_image: image?.image_url ?? null,
          quantity,
          // From the catalogue, never from the caller.
          unit_price: product.price,
          subtotal: product.price * quantity,
        }
      })

      const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0)
      // Tax and shipping are policy, not customer input. Free delivery over
      // Rs 100,000 is the same rule the cart shows.
      const tax = calculateTax(subtotal)
      const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING
      const discount = 0
      const total = calculateTotal(subtotal, tax, shipping, discount)

      // Create order
      const orderNumber = generateOrderNumber()
      const orderResult = db.prepare(`
        INSERT INTO orders (
          order_number, customer_name, customer_email, customer_phone,
          shipping_address, billing_address, subtotal, tax, shipping_cost,
          discount, total, status, payment_method, payment_status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderNumber,
        body.customer_name || null,
        body.customer_email || null,
        // Stored in the same canonical form the counter uses, so one person
        // ordering online and buying in store is one customer.
        body.customer_phone ? normalisePhone(body.customer_phone) : null,
        body.shipping_address || null,
        body.billing_address || null,
        subtotal,
        tax,
        shipping,
        discount,
        total,
        'pending',
        body.payment_method || 'stripe', // Default to stripe for online orders
        'pending', // Start with pending, will be updated after successful payment
        body.notes || null
      )

      const orderId = orderResult.lastInsertRowid

      const insertItem = db.prepare(`
        INSERT INTO order_items (
          order_id, product_id, product_name, product_sku, product_image,
          quantity, unit_price, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)

      // The WHERE guard is the real check. Between reading the stock above and
      // writing it here another order can land, and the conditional update is
      // what makes the pair atomic rather than merely sequential.
      const updateStock = db.prepare(
        'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?'
      )

      for (const line of lines) {
        insertItem.run(
          orderId,
          line.product_id,
          line.product_name,
          line.product_sku,
          line.product_image,
          line.quantity,
          line.unit_price,
          line.subtotal
        )

        const stockResult = updateStock.run(line.quantity, line.product_id, line.quantity)
        if (stockResult.changes === 0) {
          throw Object.assign(
            new Error(`${line.product_name} sold out while you were checking out`),
            { status: 409 }
          )
        }
      }

      // Fetch created order
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as Record<string, unknown>
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId)

      return NextResponse.json(
        apiResponse({ ...order, items }),
        { status: 201 }
      )
    })
  } catch (error: any) {
    // A rejected order is usually the customer's to fix -- out of stock, a
    // piece withdrawn, a bad quantity -- and answering 500 to all of it told
    // them the shop was broken when it was not.
    const status = typeof error?.status === 'number' ? error.status : 500
    if (status >= 500) console.error('Error creating order:', error)

    return NextResponse.json(
      apiError(status >= 500 ? 'We could not place that order' : error.message),
      { status }
    )
  }
}