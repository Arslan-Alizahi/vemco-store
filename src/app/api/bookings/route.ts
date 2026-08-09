import { NextRequest, NextResponse } from 'next/server'
import { apiError, apiResponse } from '@/lib/utils'
import { createBooking, listBookings } from '@/lib/bookings'
import { bookingConfirmationMail, sendMail } from '@/lib/mail'

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

    /**
     * Put the booking in writing, to the customer.
     *
     * This is the message that matters most in the shop: a booking is a
     * promise about a date and a sum of money, made across a counter, and
     * without it the customer walks out holding only a printed slip they can
     * lose. It repeats the delivery date, what they handed over, and what is
     * still owed -- the three things they will be asked about at the door.
     *
     * Never allowed to fail the booking. The advance has been taken and the
     * stock is reserved; an unreachable mail server does not undo that.
     */
    const email = typeof body?.customer_email === 'string' ? body.customer_email.trim() : ''
    if (email) {
      try {
        const result = await sendMail(
          bookingConfirmationMail({
            to: email,
            customerName: booking.customer_name,
            bookingNumber: booking.booking_number,
            items: booking.items,
            subtotal: booking.subtotal,
            tax: booking.tax,
            discount: booking.discount,
            total: booking.total,
            paid: booking.paid,
            balance: booking.balance,
            deliveryDate: booking.delivery_date,
          })
        )
        if (!result.sent) {
          console.warn(`Booking ${booking.booking_number} taken, no email sent: ${result.reason}`)
        }
      } catch (error) {
        console.error('Booking taken, but the confirmation email failed:', error)
      }
    }

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
