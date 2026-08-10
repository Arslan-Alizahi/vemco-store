import { NextRequest, NextResponse } from 'next/server'
import { apiError, apiResponse } from '@/lib/utils'
import { createEnquiry, listEnquiries, type EnquiryStatus } from '@/lib/enquiries'
import { enquiryForShopMail, enquiryReceivedMail, sendMail } from '@/lib/mail'
import { BRAND_EMAIL, BRAND_PHONES } from '@/lib/brand'
import { clientKey, createRateLimiter } from '@/lib/rate-limit'

/** Never evaluated at build time -- it reads the database. */
export const dynamic = 'force-dynamic'

/**
 * Three enquiries per address every ten minutes.
 *
 * This form is the one place the public can write to the database without a
 * session, which is exactly what makes it useful and exactly what makes it a
 * target. Left open, a bot filling it overnight would bury real customers in
 * the shop's list and burn through the Gmail sending quota, so the genuine
 * confirmations would stop arriving -- the failure nobody would notice until
 * a customer rang to ask why they never got their reference.
 *
 * Three is chosen to be invisible to a person. Somebody asking about a sofa,
 * changing their mind and asking about a dining table, then correcting a typo
 * in their number, has used all the allowance a real customer ever needs.
 */
const enquiryLimit = createRateLimiter({ max: 3, windowMs: 10 * 60 * 1000 })

/**
 * Reading the list needs a session: it is a page of names, phone numbers and
 * what people are interested in buying. Sending one does not -- that is the
 * public asking to be called back, and requiring an account for it would
 * defeat the entire purpose of the form.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const known = ['new', 'contacted', 'closed']

    return NextResponse.json(
      apiResponse(
        await listEnquiries({
          status: known.includes(status ?? '') ? (status as EnquiryStatus) : undefined,
          search: searchParams.get('search') ?? undefined,
        })
      )
    )
  } catch (error) {
    console.error('Error listing enquiries:', error)
    return NextResponse.json(apiError('We could not load the enquiries'), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const key = clientKey(request)
    if (enquiryLimit.exceeded(key)) {
      const minutes = enquiryLimit.retryAfterMinutes(key)
      /**
       * 429, and a message written for the person rather than the bot.
       *
       * A real customer can hit this -- three attempts is not many if the
       * form refuses them twice for a typo -- so it tells them the shop is
       * still reachable and how, rather than leaving them with a wall.
       */
      return NextResponse.json(
        apiError(
          `You have sent a few enquiries already. Try again in ${minutes} ${
            minutes === 1 ? 'minute' : 'minutes'
          }, or ring us on ${BRAND_PHONES[0]} — we would rather talk anyway.`
        ),
        { status: 429, headers: { 'Retry-After': String(minutes * 60) } }
      )
    }

    const body = await request.json()

    const enquiry = await createEnquiry({
      intent: body?.intent,
      customer_name: String(body?.customer_name ?? ''),
      customer_phone: String(body?.customer_phone ?? ''),
      customer_email: body?.customer_email ?? null,
      city: body?.city ?? null,
      visit_date: body?.visit_date ?? null,
      message: body?.message ?? null,
      items: Array.isArray(body?.items) ? body.items : [],
    })

    /**
     * Two messages, neither of which may fail the enquiry.
     *
     * The shop's copy is the one that matters: it is the thing that makes
     * somebody pick up the phone. The customer's copy carries the reference
     * and the numbers, so the next step survives closing the browser tab.
     *
     * Sent in parallel and awaited together -- a serverless function can be
     * frozen the moment it returns a response, and an un-awaited promise
     * there is simply an email that never sends, in production only.
     */
    const results = await Promise.allSettled([
      sendMail(enquiryForShopMail({ to: BRAND_EMAIL, enquiry })),
      enquiry.customer_email
        ? sendMail(enquiryReceivedMail({ to: enquiry.customer_email, enquiry }))
        : Promise.resolve({ sent: false, reason: 'no address given' }),
    ])

    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('Enquiry saved, but an email failed:', result.reason)
      } else if (!result.value.sent && result.value.reason !== 'no address given') {
        console.warn(`Enquiry ${enquiry.reference} saved, no email sent: ${result.value.reason}`)
      }
    }

    return NextResponse.json(apiResponse(enquiry), { status: 201 })
  } catch (error: any) {
    /**
     * A refused enquiry is almost always something the customer can fix --
     * no phone number, no visit date, an empty basket -- so it says which.
     */
    const status = typeof error?.status === 'number' ? error.status : 500
    if (status >= 500) console.error('Error creating enquiry:', error)

    return NextResponse.json(
      apiError(status >= 500 ? 'We could not send that enquiry' : error.message),
      { status }
    )
  }
}
