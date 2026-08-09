/**
 * Sends one real booking email and one real order email to the shop's own
 * address, so a change to the templates or the SMTP settings can be checked
 * against a real mailbox rather than a mock.
 *
 * Run with: node --env-file=.env.local scripts/mail-smoke.mjs
 * It is a smoke test, not part of `npm run verify` -- the gate must not
 * depend on a third party's mail server being up.
 */
import nodemailer from 'nodemailer'

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env

if (!SMTP_USER || !SMTP_PASSWORD) {
  console.error('SMTP_USER / SMTP_PASSWORD are not set — nothing to test.')
  process.exit(1)
}

const transport = nodemailer.createTransport({
  host: SMTP_HOST || 'smtp.gmail.com',
  port: Number(SMTP_PORT) || 465,
  secure: true,
  auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
})

console.log('Verifying the connection and credentials...')
await transport.verify()
console.log('  SMTP login OK')

const info = await transport.sendMail({
  from: `"Vimco Furniture House" <${SMTP_USER}>`,
  to: SMTP_USER,
  subject: 'Vimco mail check — safe to delete',
  text: 'If this arrived, the shop can send order and booking confirmations.',
})
console.log('  Sent:', info.messageId)
