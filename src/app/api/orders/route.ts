import { NextRequest, NextResponse } from 'next/server'
import { runGet, runQuery, runTransaction, runUpdate } from '@/lib/db'
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

    const orders = await runQuery<Order>(sql, params)

    // All the items for the page in one query rather than one per order --
    // the admin's order list would otherwise open a connection per row.
    const ids = orders.map(order => order.id)
    const allItems = ids.length
      ? await runQuery<{ order_id: number }>(
          `SELECT * FROM order_items WHERE order_id IN (${ids.map(() => '?').join(', ')})`,
          ids
        )
      : []

    const byOrder = new Map<number, any[]>()
    for (const item of allItems) {
      byOrder.set(item.order_id, [...(byOrder.get(item.order_id) ?? []), item])
    }

    const ordersWithItems = orders.map(order => ({
      ...order,
      items: byOrder.get(order.id) ?? [],
    }))

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

    const requested = parseItems(body.items)

    // Two lines for the same product would each pass the stock check on their
    // own and together take more than there is.
    const merged = new Map<number, number>()
    for (const item of requested) {
      merged.set(item.product_id, (merged.get(item.product_id) ?? 0) + item.quantity)
    }

    return await runTransaction(async tx => {
      const productIds = Array.from(merged.keys())
      const placeholders = productIds.map(() => '?').join(', ')

      /**
       * Every product and its cover photograph, in two queries rather than
       * two per line. A five-item basket used to make ten sequential trips
       * to the database while holding a transaction open -- and a transaction
       * held open across ten network round trips is a lock held for ten
       * network round trips.
       */
      const [found, images] = await Promise.all([
        runQuery<{
          id: number
          name: string
          sku: string
          price: number
          stock_quantity: number
          is_active: number
        }>(
          `SELECT id, name, sku, price, stock_quantity, is_active
           FROM products WHERE id IN (${placeholders})`,
          productIds,
          tx
        ),

        runQuery<{ product_id: number; image_url: string }>(
          `SELECT DISTINCT ON (product_id) product_id, image_url
           FROM product_images
           WHERE product_id IN (${placeholders})
           ORDER BY product_id, is_primary DESC, display_order ASC`,
          productIds,
          tx
        ),
      ])

      const products = new Map(found.map(product => [product.id, product]))
      const coverImage = new Map(images.map(image => [image.product_id, image.image_url]))

      const lines = Array.from(merged.entries()).map(([productId, quantity]) => {
        const product = products.get(productId)

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

        return {
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
          product_image: coverImage.get(productId) ?? null,
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
      const order = (await runGet(
        `
        INSERT INTO orders (
          order_number, customer_name, customer_email, customer_phone,
          shipping_address, billing_address, subtotal, tax, shipping_cost,
          discount, total, status, payment_method, payment_status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING *
      `,
        [
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
          body.notes || null,
        ],
        tx
      )) as Record<string, unknown>

      const orderId = order.id as number

      for (const line of lines) {
        await runGet(
          `
        INSERT INTO order_items (
          order_id, product_id, product_name, product_sku, product_image,
          quantity, unit_price, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
          [
            orderId,
            line.product_id,
            line.product_name,
            line.product_sku,
            line.product_image,
            line.quantity,
            line.unit_price,
            line.subtotal,
          ],
          tx
        )

        // The WHERE guard is the real check. Between reading the stock above
        // and writing it here another order can land, and the conditional
        // update is what makes the pair atomic rather than merely sequential.
        const changed = await runUpdate(
          'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?',
          [line.quantity, line.product_id, line.quantity],
          tx
        )

        if (changed === 0) {
          throw Object.assign(
            new Error(`${line.product_name} sold out while you were checking out`),
            { status: 409 }
          )
        }
      }

      const items = await runQuery('SELECT * FROM order_items WHERE order_id = ?', [orderId], tx)

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