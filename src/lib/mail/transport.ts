import 'server-only'
import nodemailer, { type Transporter } from 'nodemailer'
import { BRAND_EMAIL, BRAND_NAME } from '@/lib/brand'

/**
 * Sending mail from the shop's own Gmail account.
 *
 * Gmail over SMTP with an app password rather than an API: the shop already
 * has the mailbox, the volume is a handful of messages a day, and an app
 * password can be revoked from the Google account page by the owner without
 * anybody touching this code. Two-factor stays on; that is what makes app
 * passwords available in the first place.
 *
 * Port 465 with implicit TLS, not 587 with STARTTLS. On 587 a connection
 * that fails to upgrade can silently continue in the clear, and this
 * connection carries a credential that grants access to the whole mailbox.
 */

/** Read lazily. An import must not be able to throw for want of a variable. */
const config = () => {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD
  if (!user || !pass) return null
  return { user, pass }
}

/**
 * One transporter for the process, not one per message.
 *
 * Nodemailer pools connections, and Gmail rate-limits new ones hard enough
 * that a burst of orders opening a socket each would start being refused.
 * Held on globalThis so Next's dev-mode module reloading does not leak a new
 * pool on every edit -- the same reason the database client is held there.
 */
const globalForMail = globalThis as unknown as { vimcoMailer?: Transporter | null }

export const mailer = (): Transporter | null => {
  if (globalForMail.vimcoMailer !== undefined) return globalForMail.vimcoMailer

  const credentials = config()
  if (!credentials) {
    // Not an error. A developer running the shop locally has no business
    // sending real mail to real customers, and the shop must still work.
    console.warn('[mail] SMTP_USER / SMTP_PASSWORD not set — email is disabled')
    globalForMail.vimcoMailer = null
    return null
  }

  globalForMail.vimcoMailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: credentials,
    pool: true,
    maxConnections: 2,
    // Gmail will not accept a From that is not the authenticated account,
    // so there is nothing to gain from a longer socket timeout than this.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  })

  return globalForMail.vimcoMailer
}

export interface Mail {
  to: string
  subject: string
  /** The real message. Every mail here has one; HTML is the enhancement. */
  text: string
  html: string
}

export interface SendResult {
  sent: boolean
  reason?: string
}

/**
 * Send, and never throw.
 *
 * Every caller is finishing a transaction the customer has already paid for.
 * A mail server that is slow, rate-limited or misconfigured must not turn a
 * completed sale into a failed request -- the order exists, the money moved,
 * and the receipt printed. The failure is logged and the caller carries on.
 */
export async function sendMail(mail: Mail): Promise<SendResult> {
  const transport = mailer()
  if (!transport) return { sent: false, reason: 'email is not configured' }

  if (!mail.to || !mail.to.includes('@')) {
    return { sent: false, reason: 'no usable address' }
  }

  try {
    await transport.sendMail({
      from: `"${BRAND_NAME}" <${process.env.SMTP_USER || BRAND_EMAIL}>`,
      replyTo: BRAND_EMAIL,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    })
    return { sent: true }
  } catch (error) {
    console.error('[mail] send failed:', error)
    return { sent: false, reason: error instanceof Error ? error.message : 'unknown error' }
  }
}
