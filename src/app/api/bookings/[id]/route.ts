import { NextRequest, NextResponse } from 'next/server'
import { apiError, apiResponse } from '@/lib/utils'
import { cancelBooking, getBooking, markBookingDelivered } from '@/lib/bookings'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const booking = await getBooking(Number(params.id))

    if (!booking) {
      return NextResponse.json(apiError('We could not find that booking'), { status: 404 })
    }

    return NextResponse.json(apiResponse(booking))
  } catch (error) {
    console.error('Error loading booking:', error)
    return NextResponse.json(apiError('We could not load that booking'), { status: 500 })
  }
}

/**
 * The two things that can happen to a booking after it is taken: it is handed
 * over, or it is called off. Both are one-way, so they are named actions
 * rather than a status field the caller can set to anything.
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const id = Number(params.id)

    if (body?.action === 'deliver') {
      return NextResponse.json(apiResponse(await markBookingDelivered(id)))
    }

    if (body?.action === 'cancel') {
      return NextResponse.json(apiResponse(await cancelBooking(id)))
    }

    return NextResponse.json(apiError('Unknown action'), { status: 400 })
  } catch (error: any) {
    const status = typeof error?.status === 'number' ? error.status : 500
    if (status >= 500) console.error('Error updating booking:', error)

    return NextResponse.json(
      apiError(status >= 500 ? 'We could not update that booking' : error.message),
      { status }
    )
  }
}
