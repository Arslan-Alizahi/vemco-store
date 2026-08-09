import { NextRequest, NextResponse } from 'next/server'
import { apiError, apiResponse } from '@/lib/utils'
import { recordBookingPayment } from '@/lib/bookings'

export const dynamic = 'force-dynamic'

/**
 * A further instalment, or the balance on collection day.
 *
 * Its own route rather than a field on the booking, because a payment is an
 * event with a time and a method attached, not a number that gets overwritten.
 * The ledger is what makes the balance trustworthy.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()

    const booking = await recordBookingPayment(
      Number(params.id),
      Number(body?.amount),
      body?.payment_method ?? 'cash',
      body?.notes ?? null
    )

    return NextResponse.json(apiResponse(booking), { status: 201 })
  } catch (error: any) {
    const status = typeof error?.status === 'number' ? error.status : 500
    if (status >= 500) console.error('Error recording booking payment:', error)

    return NextResponse.json(
      apiError(status >= 500 ? 'We could not record that payment' : error.message),
      { status }
    )
  }
}
