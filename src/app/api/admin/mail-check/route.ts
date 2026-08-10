import { NextRequest, NextResponse } from 'next/server'
import { apiError, apiResponse } from '@/lib/utils'
import { sendMail } from '@/lib/mail'
import { BRAND_EMAIL, BRAND_NAME } from '@/lib/brand'

export const dynamic = 'force-dynamic'

/**
 * Whether this deployment can send email, answered by the deployment itself.
 *
 * Exists because of a failure that is invisible from every side. The shop
 * takes an enquiry, the customer sees a confirmation page, the record lands
 * in the database, and nothing arrives -- because the mail settings were
 * added to the host after the last build, so the running server never saw
 * them. Nothing about that is visible without reading server logs, and by
 * design the shop never fails an enquiry over a mail problem.
 *
 * Behind /api/admin, so the middleware requires a session. Reports the state,
 * never the credentials: whether a user is set, whether a password is set,
 * and the host and port. The password itself is not echoed in any form.
 */
export async function GET(request: NextRequest) {
  const user = process.env.SMTP_USER
  const password = process.env.SMTP_PASSWORD

  const configured = Boolean(user && password)
  const state = {
    configured,
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    user: user || null,
    passwordSet: Boolean(password),
    sendsTo: BRAND_EMAIL,
  }

  if (!configured) {
    return NextResponse.json(
      apiResponse({
        ...state,
        verdict:
          'This deployment cannot send email. SMTP_USER and SMTP_PASSWORD are ' +
          'not set here. On Netlify they are read when the site is built, so ' +
          'adding them is not enough on its own — the site has to be deployed ' +
          'again afterwards.',
      })
    )
  }

  /**
   * `?send=<address>` actually posts a letter, so the answer is not "the
   * settings look right" but "one arrived". Everything up to the mail server
   * can be correct and the mail still not appear.
   */
  const to = new URL(request.url).searchParams.get('send')
  if (!to) {
    return NextResponse.json(
      apiResponse({
        ...state,
        verdict: 'Configured. Add ?send=you@example.com to post a real test message.',
      })
    )
  }

  const result = await sendMail({
    to,
    subject: `${BRAND_NAME} — mail check`,
    text: `If this arrived, the live site can send email.\n\nSent from the deployment itself, not from anybody's laptop.`,
    html: `<p>If this arrived, the live site can send email.</p><p>Sent from the deployment itself, not from anybody's laptop.</p>`,
  })

  return NextResponse.json(
    apiResponse({
      ...state,
      sentTo: to,
      sent: result.sent,
      verdict: result.sent
        ? `Accepted by ${state.host}. If it is not in the inbox, look in Spam and in All Mail — Gmail hides a message sent from an address to itself.`
        : `Refused: ${result.reason}`,
    }),
    { status: result.sent ? 200 : 502 }
  )
}
