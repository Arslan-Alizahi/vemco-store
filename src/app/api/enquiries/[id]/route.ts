import { NextRequest, NextResponse } from 'next/server'
import { apiError, apiResponse } from '@/lib/utils'
import { setEnquiryStatus, type EnquiryStatus } from '@/lib/enquiries'

export const dynamic = 'force-dynamic'

const KNOWN: EnquiryStatus[] = ['new', 'contacted', 'closed']

/**
 * Behind the admin session, like the list itself -- this is the shop working
 * its own pipeline, not the customer editing their enquiry.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(apiError('That enquiry does not exist'), { status: 400 })
    }

    const body = await request.json()
    const status = body?.status as EnquiryStatus

    if (!KNOWN.includes(status)) {
      return NextResponse.json(apiError('Unknown status'), { status: 400 })
    }

    const updated = await setEnquiryStatus(id, status, body?.notes ?? null)
    if (!updated) {
      return NextResponse.json(apiError('That enquiry does not exist'), { status: 404 })
    }

    return NextResponse.json(apiResponse(updated))
  } catch (error) {
    console.error('Error updating enquiry:', error)
    return NextResponse.json(apiError('We could not update that enquiry'), { status: 500 })
  }
}
