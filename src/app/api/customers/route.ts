import { NextRequest, NextResponse } from 'next/server'
import { apiResponse, apiError } from '@/lib/utils'
import { listCustomers, upsertCustomer } from '@/lib/customers'

export const dynamic = 'force-dynamic'

/**
 * The customer list.
 *
 * Behind the admin session — middleware covers `/api/customers` because it is
 * not on the public-write list and this is a GET of personal data, the same
 * treatment `/api/orders` gets. A shop's customer list with names, phone
 * numbers and spend is the last thing that should answer to anyone.
 */
export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get('search') ?? undefined
    return NextResponse.json(apiResponse(await listCustomers(search)))
  } catch (error) {
    console.error('Error listing customers:', error)
    return NextResponse.json(apiError('We could not load the customers'), { status: 500 })
  }
}

/** Create or update by phone. Used by the till when a sale is completed. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const customer = await upsertCustomer({
      name: String(body?.name ?? ''),
      phone: String(body?.phone ?? ''),
      email: body?.email ?? null,
      address: body?.address ?? null,
    })

    if (!customer) {
      return NextResponse.json(apiError('A name and phone number are both required'), {
        status: 400,
      })
    }

    return NextResponse.json(apiResponse(customer), { status: 201 })
  } catch (error) {
    console.error('Error saving customer:', error)
    return NextResponse.json(apiError('We could not save that customer'), { status: 500 })
  }
}
