import { toInternationalPhone } from '@/lib/phone'
import { formatCurrency } from '@/lib/utils'
import type { BookingDetail } from '@/lib/bookings'

/**
 * Sending a bill on WhatsApp, without a WhatsApp account.
 *
 * This builds a `wa.me` link with the message already written. Tapping it
 * opens WhatsApp on the shop's own phone with the customer's chat and the
 * bill typed out, and the shopkeeper presses send. Nothing is transmitted by
 * this application and no message can be sent without somebody seeing it
 * first.
 *
 * The alternative is the WhatsApp Business API, which means a Meta business
 * account, a verified number, message templates approved in advance, and a
 * per-message fee. That is the right answer for a shop sending thousands of
 * messages; it is a great deal of machinery for a counter that sends a few a
 * day, and it cannot be set up from here.
 */

const SHOP_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'Vimco Furniture House'

/** Dates as a customer reads them, not as a database stores them. */
const readableDate = (value: string): string =>
  new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

/**
 * The message itself.
 *
 * Plain text on purpose. WhatsApp supports *bold* and _italics_, but the
 * asterisks show as literal characters wherever the preview is rendered
 * differently, and a bill that a customer has to squint at is worse than a
 * plain one. What matters is that the four numbers a customer will check --
 * total, paid, outstanding, and the date -- are each on their own line.
 */
export const bookingMessage = (booking: BookingDetail): string => {
  const lines = [
    `${SHOP_NAME} — Booking ${booking.booking_number}`,
    '',
    `Customer: ${booking.customer_name}`,
    '',
    ...booking.items.map(
      item => `${item.quantity} × ${item.product_name} — ${formatCurrency(item.subtotal)}`
    ),
    '',
    `Total: ${formatCurrency(booking.total)}`,
    `Paid: ${formatCurrency(booking.paid)}`,
  ]

  if (booking.balance > 0.01) {
    lines.push(`Balance due: ${formatCurrency(booking.balance)}`)
  } else {
    lines.push('Balance: nil — paid in full')
  }

  lines.push(
    '',
    booking.status === 'delivered'
      ? `Delivered on ${readableDate(booking.delivered_at ?? booking.delivery_date)}`
      : `Delivery on ${readableDate(booking.delivery_date)}`,
    '',
    'Please keep this message. Bring it with you on delivery day.',
  )

  return lines.join('\n')
}

/**
 * The link, or null when there is no number worth opening a chat with.
 *
 * Callers should hide the button rather than render a dead one -- a WhatsApp
 * button that opens an empty chat looks like the shop lost the customer's
 * details.
 */
export const bookingWhatsappLink = (booking: BookingDetail): string | null => {
  const international = toInternationalPhone(booking.customer_phone)
  if (!international) return null

  return `https://wa.me/${international}?text=${encodeURIComponent(bookingMessage(booking))}`
}
