import { NextRequest, NextResponse } from 'next/server'
import { runGet, runUpdate } from '@/lib/db'
import { apiResponse, apiError } from '@/lib/utils'
import { getCustomer, getCustomerPurchases, normalisePhone } from '@/lib/customers'

export const dynamic = 'force-dynamic'

/** One customer, with everything they have ever bought. */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(apiError('Invalid customer'), { status: 400 })
    }

    const [customer, purchases] = await Promise.all([getCustomer(id), getCustomerPurchases(id)])

    if (!customer) {
      return NextResponse.json(apiError('We could not find that customer'), { status: 404 })
    }

    return NextResponse.json(apiResponse({ customer, purchases }))
  } catch (error) {
    console.error('Error loading customer:', error)
    return NextResponse.json(apiError('We could not load that customer'), { status: 500 })
  }
}

/** Edit the details. The history is derived and cannot be edited here. */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)
    const body = await request.json()

    const name = String(body?.name ?? '').trim()
    const phone = normalisePhone(String(body?.phone ?? ''))

    if (!name || !phone) {
      return NextResponse.json(apiError('A name and phone number are both required'), {
        status: 400,
      })
    }

    // The phone is the identity, so moving it onto somebody else's number
    // would silently merge two people's histories.
    const clash = await runGet<{ id: number }>(
      'SELECT id FROM customers WHERE phone = ? AND id != ?',
      [phone, id]
    )

    if (clash) {
      return NextResponse.json(
        apiError('Another customer already has that phone number'),
        { status: 409 }
      )
    }

    await runUpdate(
      `UPDATE customers
       SET name = ?, phone = ?, email = ?, address = ?, notes = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        name,
        phone,
        body?.email?.trim() || null,
        body?.address?.trim() || null,
        body?.notes?.trim() || null,
        id,
      ]
    )

    return NextResponse.json(apiResponse(await getCustomer(id)))
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json(apiError('We could not save that customer'), { status: 500 })
  }
}

/**
 * Removes a customer record.
 *
 * What this does and does not touch matters, because "delete the customer"
 * could reasonably mean two very different things:
 *
 *   - Till receipts keep their copy of the name and phone and lose only the
 *     link (ON DELETE SET NULL). A receipt reprinted in two years must still
 *     say who it was for; the shop's books are not the customer's to erase.
 *   - Bookings refuse (ON DELETE RESTRICT), so somebody with furniture on
 *     order cannot be deleted at all. That is the right answer -- a booking
 *     is a promise about a delivery date, and deleting the only record of
 *     who it is for would leave the shop holding a sofa for nobody.
 *
 * The refusal is checked here rather than left to the database, so the reason
 * reaches the person clicking the button instead of a foreign key error.
 */
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(apiError('Invalid customer'), { status: 400 })
    }

    const customer = await getCustomer(id)
    if (!customer) {
      return NextResponse.json(apiError('We could not find that customer'), { status: 404 })
    }

    /**
     * Every booking counts, not only the ones still awaiting collection.
     *
     * The first version of this checked `status = 'booked'`, which read
     * sensibly and was wrong: bookings.customer_id is NOT NULL with ON DELETE
     * RESTRICT, so the database blocks the delete for a cancelled or
     * delivered booking exactly as hard as a pending one. The guard let those
     * through and the customer got "We could not delete that customer" from a
     * 500 -- the database saying no in a way nobody could act on.
     *
     * Refusing is the right behaviour: a booking is a record of a promise,
     * and it has to be able to say whose. What was missing was the reason.
     */
    const held = (await runGet<{ n: number; pending: number }>(
      `SELECT COUNT(*)::int AS n,
              COUNT(*) FILTER (WHERE status = 'booked')::int AS pending
         FROM bookings WHERE customer_id = ?`,
      [id]
    )) as { n: number; pending: number } | undefined

    if ((held?.n ?? 0) > 0) {
      const { n, pending } = held!
      return NextResponse.json(
        apiError(
          pending > 0
            ? `${customer.name} has ${pending} booking${pending === 1 ? '' : 's'} still waiting to be collected, so this record cannot be removed. Deliver or cancel ${pending === 1 ? 'it' : 'them'} first.`
            : `${customer.name} is named on ${n} booking${n === 1 ? '' : 's'} in the shop's records, so this record has to stay — a booking must be able to say whose it was.`
        ),
        { status: 409 }
      )
    }

    await runUpdate('DELETE FROM customers WHERE id = ?', [id])

    return NextResponse.json(apiResponse({ id, name: customer.name }))
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json(apiError('We could not delete that customer'), { status: 500 })
  }
}
