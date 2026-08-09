import { NextRequest, NextResponse } from 'next/server'
import { apiError, apiResponse } from '@/lib/utils'
import { createBooking, listBookings } from '@/lib/bookings'

/**
 * Never evaluated at build time -- it reads the database.
 */
export const dynamic = 'force-dynamic'

/**
 * Behind the admin session, like every other route that holds customer
 * records. A booking carries a name, a phone number and what somebody still
 * owes; it is not public.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    return NextResponse.json(
      apiResponse(
        await listBookings({
          status: status === 'booked' || status === 'delivered' || status === 'cancelled'
            ? status
            : undefined,
          search: searchParams.get('search') ?? undefined,
        })
      )
    )
  } catch (error) {
    console.error('Error listing bookings:', error)
    return NextResponse.json(apiError('We could not load the bookings'), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const booking = await createBooking({
      customer_name: String(body?.customer_name ?? ''),
      customer_phone: String(body?.customer_phone ?? ''),
      customer_email: body?.customer_email ?? null,
      items: body?.items ?? [],
      tax: Number(body?.tax ?? 0),
      discount: Number(body?.discount ?? 0),
      delivery_date: String(body?.delivery_date ?? ''),
      advance: Number(body?.advance ?? 0),
      payment_method: body?.payment_method ?? 'cash',
      notes: body?.notes ?? null,
    })

    return NextResponse.json(apiResponse(booking), { status: 201 })
  } catch (error: any) {
    /**
     * A refused booking is usually something the cashier can fix -- no
     * advance, no date, not enough stock -- so it says which, rather than
     * answering 500 to all of it.
     */
    const status = typeof error?.status === 'number' ? error.status : 500
    if (status >= 500) console.error('Error creating booking:', error)

    return NextResponse.json(
      apiError(status >= 500 ? 'We could not take that booking' : error.message),
      { status }
    )
  }
}
