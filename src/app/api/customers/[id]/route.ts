import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
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

    const customer = getCustomer(id)
    if (!customer) {
      return NextResponse.json(apiError('We could not find that customer'), { status: 404 })
    }

    return NextResponse.json(apiResponse({ customer, purchases: getCustomerPurchases(id) }))
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

    const db = getDb()

    // The phone is the identity, so moving it onto somebody else's number
    // would silently merge two people's histories.
    const clash = db
      .prepare('SELECT id FROM customers WHERE phone = ? AND id != ?')
      .get(phone, id) as { id: number } | undefined

    if (clash) {
      return NextResponse.json(
        apiError('Another customer already has that phone number'),
        { status: 409 }
      )
    }

    db.prepare(
      `UPDATE customers
       SET name = ?, phone = ?, email = ?, address = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(name, phone, body?.email?.trim() || null, body?.address?.trim() || null, body?.notes?.trim() || null, id)

    return NextResponse.json(apiResponse(getCustomer(id)))
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json(apiError('We could not save that customer'), { status: 500 })
  }
}
