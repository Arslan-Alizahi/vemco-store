import { NextRequest, NextResponse } from 'next/server'
import { apiResponse, apiError } from '@/lib/utils'
import { findCustomerByPhone } from '@/lib/customers'

export const dynamic = 'force-dynamic'

/**
 * One customer by phone, for the till.
 *
 * A cashier types the number the customer reads out and the name fills
 * itself in. Returns null rather than 404 for an unknown number: at a
 * counter, "we have not met this person" is an ordinary answer, not an error
 * worth putting in a console.
 */
export async function GET(request: NextRequest) {
  try {
    const phone = request.nextUrl.searchParams.get('phone')
    if (!phone) {
      return NextResponse.json(apiError('A phone number is required'), { status: 400 })
    }

    return NextResponse.json(apiResponse(await findCustomerByPhone(phone)))
  } catch (error) {
    console.error('Error looking up customer:', error)
    return NextResponse.json(apiError('We could not look that number up'), { status: 500 })
  }
}
