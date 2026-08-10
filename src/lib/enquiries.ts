import { runGet, runQuery, runTransaction } from '@/lib/db'
import { normalisePhone } from '@/lib/phone'

/**
 * Enquiries: the online shop's actual job.
 *
 * Nobody buys a sofa the way they buy a phone charger. They look at it, ask
 * what the frame is made of, want to sit on it, and want to talk to a person
 * before parting with a month's salary. So the website does not take money.
 * It takes a name and a number, gives the customer a reference and the shop's
 * phone lines, and gets out of the way of the conversation that actually
 * sells furniture.
 *
 * Nothing is reserved by an enquiry. A piece is held when an advance is paid
 * at the shop -- holding stock because a stranger filled in a form would show
 * every other customer an item as unavailable on the strength of somebody who
 * never called back.
 */

/** The three conversations a customer can start. */
export const ENQUIRY_INTENTS = ['visit', 'reserve', 'delivery'] as const
export type EnquiryIntent = (typeof ENQUIRY_INTENTS)[number]

export type EnquiryStatus = 'new' | 'contacted' | 'closed'

export interface EnquiryLine {
  product_id: number | null
  product_name: string
  product_sku: string | null
  quantity: number
  unit_price: number
  subtotal: number
}

export interface Enquiry {
  id: number
  reference: string
  intent: EnquiryIntent
  customer_name: string
  customer_phone: string
  customer_email: string | null
  city: string | null
  visit_date: string | null
  message: string | null
  items_total: number
  status: EnquiryStatus
  handled_at: string | null
  notes: string | null
  created_at: string
}

export interface EnquiryDetail extends Enquiry {
  items: EnquiryLine[]
}

/**
 * Characters that survive being read down a phone line.
 *
 * No 0/O, no 1/I/L, no 5/S, no 8/B. The reference exists to be spoken --
 * "quote VIM-K7R2QX when you ring" -- and a code that needs spelling out
 * letter by letter is a code that gets written down wrong, and then the shop
 * cannot find the enquiry the customer is calling about.
 */
const READABLE = 'ACDEFGHJKMNPQRTUVWXY2346799'

const randomReference = (): string => {
  let out = ''
  for (let i = 0; i < 6; i++) {
    out += READABLE[Math.floor(Math.random() * READABLE.length)]
  }
  return `VIM-${out}`
}

export interface CreateEnquiryInput {
  intent: EnquiryIntent
  customer_name: string
  customer_phone: string
  customer_email?: string | null
  city?: string | null
  visit_date?: string | null
  message?: string | null
  items: {
    product_id?: number | null
    product_name: string
    product_sku?: string | null
    quantity: number
    unit_price: number
  }[]
}

const fail = (message: string, status = 400) =>
  Object.assign(new Error(message), { status })

/**
 * Takes the enquiry, and nothing else.
 *
 * No stock is touched, no money is taken, no customer record is created --
 * an enquiry is a request to talk, and a shop that turns every browser into a
 * customer record ends up with a contact list of people who never replied.
 * The counter creates the customer when the conversation becomes a sale.
 */
export async function createEnquiry(input: CreateEnquiryInput): Promise<EnquiryDetail> {
  const intent = input.intent
  if (!ENQUIRY_INTENTS.includes(intent)) {
    throw fail('Choose what you would like to do')
  }

  const name = (input.customer_name || '').trim()
  const phone = (input.customer_phone || '').trim()

  if (!name) throw fail('We need a name to put on the enquiry')
  // The phone number is the whole point of the form. Everything else can be
  // filled in over the telephone; without this there is no telephone call.
  if (normalisePhone(phone).length < 10) throw fail('We need a phone number we can call you on')

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw fail('Tell us which piece you are asking about')
  }

  // A visit without a day is a visit the shop cannot staff for.
  if (intent === 'visit' && !input.visit_date) {
    throw fail('Tell us which day you would like to come')
  }

  const lines: EnquiryLine[] = input.items.map(item => {
    const quantity = Math.max(1, Math.round(Number(item.quantity) || 1))
    const unitPrice = Number(item.unit_price) || 0
    return {
      product_id: item.product_id ?? null,
      product_name: String(item.product_name || 'Unnamed piece'),
      product_sku: item.product_sku ?? null,
      quantity,
      unit_price: unitPrice,
      subtotal: unitPrice * quantity,
    }
  })

  const itemsTotal = lines.reduce((sum, line) => sum + line.subtotal, 0)

  return runTransaction(async tx => {
    /**
     * Retried, because the reference is random and short.
     *
     * Six readable characters is roughly 400 million combinations, so a clash
     * is vanishingly unlikely -- but "vanishingly unlikely" is how you get a
     * unique-constraint error in production at the worst moment, and the
     * customer would see "we could not send that" for a form that was fine.
     */
    let enquiry: Record<string, unknown> | undefined
    for (let attempt = 0; attempt < 5 && !enquiry; attempt++) {
      try {
        enquiry = (await runGet(
          `INSERT INTO enquiries (
             reference, intent, customer_name, customer_phone, customer_email,
             city, visit_date, message, items_total
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           RETURNING *`,
          [
            randomReference(),
            intent,
            name,
            phone,
            input.customer_email?.trim() || null,
            input.city?.trim() || null,
            intent === 'visit' ? input.visit_date : null,
            input.message?.trim() || null,
            itemsTotal,
          ],
          tx
        )) as Record<string, unknown>
      } catch (error: any) {
        if (error?.code !== '23505' || attempt === 4) throw error
      }
    }

    const enquiryId = enquiry!.id as number

    for (const line of lines) {
      await runGet(
        `INSERT INTO enquiry_items (
           enquiry_id, product_id, product_name, product_sku, quantity, unit_price, subtotal
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          enquiryId,
          line.product_id,
          line.product_name,
          line.product_sku,
          line.quantity,
          line.unit_price,
          line.subtotal,
        ],
        tx
      )
    }

    return { ...(enquiry as unknown as Enquiry), items: lines }
  })
}

export async function listEnquiries(options: {
  status?: EnquiryStatus
  search?: string
} = {}): Promise<EnquiryDetail[]> {
  const where: string[] = []
  const params: unknown[] = []

  if (options.status) {
    where.push('status = ?')
    params.push(options.status)
  }

  if (options.search?.trim()) {
    const term = `%${options.search.trim()}%`
    where.push('(customer_name ILIKE ? OR customer_phone LIKE ? OR reference ILIKE ?)')
    params.push(term, term, term)
  }

  const enquiries = await runQuery<Enquiry>(
    `SELECT * FROM enquiries
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY created_at DESC
     LIMIT 200`,
    params
  )

  if (enquiries.length === 0) return []

  // Every line for the page in one query, not one query per enquiry.
  const ids = enquiries.map(e => e.id)
  const items = await runQuery<EnquiryLine & { enquiry_id: number }>(
    `SELECT * FROM enquiry_items WHERE enquiry_id IN (${ids.map(() => '?').join(', ')})`,
    ids
  )

  const byEnquiry = new Map<number, EnquiryLine[]>()
  for (const item of items) {
    byEnquiry.set(item.enquiry_id, [...(byEnquiry.get(item.enquiry_id) ?? []), item])
  }

  return enquiries.map(enquiry => ({ ...enquiry, items: byEnquiry.get(enquiry.id) ?? [] }))
}

/**
 * Marks an enquiry as dealt with.
 *
 * `handled_at` is stamped the first time it leaves `new`, so the shop can see
 * how long people are waiting for a call back -- which is the one number that
 * decides whether this whole flow works.
 */
export async function setEnquiryStatus(
  id: number,
  status: EnquiryStatus,
  notes?: string | null
): Promise<Enquiry | null> {
  return (
    ((await runGet(
      `UPDATE enquiries
         SET status = ?,
             notes = COALESCE(?, notes),
             handled_at = CASE WHEN handled_at IS NULL AND ? <> 'new' THEN NOW() ELSE handled_at END,
             updated_at = NOW()
       WHERE id = ?
       RETURNING *`,
      [status, notes ?? null, status, id]
    )) as Enquiry) ?? null
  )
}
