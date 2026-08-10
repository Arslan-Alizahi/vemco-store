import { bark, semantic } from '@/design/tokens'
import {
  BRAND_ADDRESS,
  BRAND_EMAIL,
  BRAND_NAME,
  BRAND_PHONES,
  BRAND_SHORT,
} from '@/lib/brand'
import { BUILDER_NAME, BUILDER_URL } from '@/components/layout/PoweredBy'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Mail } from './transport'

/**
 * The two messages the shop sends a customer.
 *
 * Pure functions over plain data, with no database and no transport, so the
 * wording and the arithmetic can be tested without a mail server -- and so a
 * mistake in a total is caught by a test rather than by the customer who
 * received it.
 *
 * Written as tables with inline styles because that is still what email
 * clients render reliably; Outlook has no grid and Gmail strips <style>.
 * Every message carries a plain-text part that says the same thing, for the
 * clients and the people that never see the HTML.
 */

export interface MailLine {
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

const escape = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** The customer's own name, or a greeting that works without one. */
const greeting = (name?: string | null) => {
  const first = (name || '').trim().split(/\s+/)[0]
  return first ? `Hello ${first},` : 'Hello,'
}

const row = (label: string, value: string, strong = false) => `
  <tr>
    <td style="padding:6px 0;color:${strong ? bark[900] : bark[600]};font-size:14px;${
      strong ? 'font-weight:600;' : ''
    }">${escape(label)}</td>
    <td align="right" style="padding:6px 0;color:${
      strong ? bark[900] : bark[900]
    };font-size:14px;${strong ? 'font-weight:600;' : ''}">${escape(value)}</td>
  </tr>`

const itemRows = (items: MailLine[]) =>
  items
    .map(
      item => `
  <tr>
    <td style="padding:8px 0;border-bottom:1px solid ${bark[200]};color:${bark[900]};font-size:14px;">
      ${escape(item.product_name)}
      <span style="color:${bark[600]};">&times;${item.quantity}</span>
    </td>
    <td align="right" style="padding:8px 0;border-bottom:1px solid ${bark[200]};color:${
      bark[900]
    };font-size:14px;white-space:nowrap;">${escape(formatCurrency(item.subtotal))}</td>
  </tr>`
    )
    .join('')

const itemLines = (items: MailLine[]) =>
  items
    .map(item => `  ${item.product_name} x${item.quantity}   ${formatCurrency(item.subtotal)}`)
    .join('\n')

/**
 * The frame every message shares: the shop's name, the body, and the ways
 * to reach a human underneath.
 *
 * The contact block is the point of the footer. Somebody reading this on a
 * phone with a question about their delivery should not have to go and find
 * the website to get a phone number.
 */
const layout = (title: string, body: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(title)}</title></head>
<body style="margin:0;padding:24px 12px;background:${semantic.canvas};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:${semantic.surface};border-radius:14px;">
    <tr><td style="padding:32px 28px;">
      <p style="margin:0;font-size:22px;letter-spacing:0.07em;color:${bark[900]};font-family:Georgia,'Times New Roman',serif;">${escape(
        BRAND_NAME
      )}</p>
      <div style="height:1px;background:${bark[200]};margin:20px 0 24px;"></div>
      ${body}
    </td></tr>
    <tr><td style="padding:0 28px 28px;">
      <div style="height:1px;background:${bark[200]};margin-bottom:16px;"></div>
      <p style="margin:0 0 4px;font-size:12px;line-height:1.6;color:${bark[600]};">${escape(
        BRAND_ADDRESS
      )}</p>
      <p style="margin:0 0 4px;font-size:12px;line-height:1.6;color:${bark[600]};">${BRAND_PHONES.map(
        p => `<a href="tel:${p.replace(/[^\d+]/g, '')}" style="color:${bark[600]};">${escape(p)}</a>`
      ).join(' &middot; ')}</p>
      <p style="margin:0 0 12px;font-size:12px;line-height:1.6;color:${bark[600]};"><a href="mailto:${BRAND_EMAIL}" style="color:${
        bark[600]
      };">${escape(BRAND_EMAIL)}</a></p>
      <p style="margin:0;font-size:11px;color:${bark[500]};">Powered by <a href="${BUILDER_URL}" style="color:${
        bark[500]
      };">${escape(BUILDER_NAME)}</a></p>
    </td></tr>
  </table>
</body></html>`

const textFooter = () =>
  [
    '',
    BRAND_ADDRESS,
    BRAND_PHONES.join(' · '),
    BRAND_EMAIL,
    '',
    `Powered by ${BUILDER_NAME} · ${BUILDER_URL}`,
  ].join('\n')

/* ------------------------------------------------------------------ */
/* An order paid for online                                            */
/* ------------------------------------------------------------------ */

export interface OrderMailInput {
  to: string
  customerName?: string | null
  orderNumber: string
  items: MailLine[]
  subtotal: number
  tax: number
  shipping: number
  total: number
  /** Where it is going. Omitted for a collection. */
  deliveryAddress?: string | null
}

export function orderConfirmationMail(order: OrderMailInput): Mail {
  const body = `
    <p style="margin:0 0 16px;font-size:16px;color:${bark[900]};">${escape(
      greeting(order.customerName)
    )}</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${bark[600]};">
      Thank you for your order. We have it, and we are getting it ready. Your order
      number is <strong style="color:${bark[900]};">${escape(order.orderNumber)}</strong> —
      quote it if you need to ask us anything about this purchase.
    </p>

    <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.17em;text-transform:uppercase;color:${
      bark[500]
    };">What you ordered</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${itemRows(order.items)}
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
      ${row('Subtotal', formatCurrency(order.subtotal))}
      ${order.tax > 0 ? row('Tax', formatCurrency(order.tax)) : ''}
      ${row(
        'Delivery',
        order.shipping > 0 ? formatCurrency(order.shipping) : 'Free'
      )}
      ${row('Total paid', formatCurrency(order.total), true)}
    </table>

    ${
      order.deliveryAddress
        ? `<p style="margin:24px 0 0;font-size:11px;letter-spacing:0.17em;text-transform:uppercase;color:${
            bark[500]
          };">Delivering to</p>
    <p style="margin:6px 0 0;font-size:14px;line-height:1.6;color:${bark[900]};">${escape(
            order.deliveryAddress
          )}</p>`
        : ''
    }

    <p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:${bark[600]};">
      We will call before we deliver to agree a time. If anything about this order is
      wrong, reply to this email or ring us — the sooner we know, the easier it is to fix.
    </p>`

  const text = [
    greeting(order.customerName),
    '',
    `Thank you for your order. Your order number is ${order.orderNumber}.`,
    '',
    'What you ordered',
    itemLines(order.items),
    '',
    `Subtotal   ${formatCurrency(order.subtotal)}`,
    ...(order.tax > 0 ? [`Tax        ${formatCurrency(order.tax)}`] : []),
    `Delivery   ${order.shipping > 0 ? formatCurrency(order.shipping) : 'Free'}`,
    `Total paid ${formatCurrency(order.total)}`,
    ...(order.deliveryAddress ? ['', `Delivering to: ${order.deliveryAddress}`] : []),
    '',
    'We will call before we deliver to agree a time. If anything is wrong, reply to this email or ring us.',
    textFooter(),
  ].join('\n')

  return {
    to: order.to,
    subject: `Thank you — order ${order.orderNumber} confirmed`,
    text,
    html: layout(`Order ${order.orderNumber}`, body),
  }
}

/* ------------------------------------------------------------------ */
/* A booking: some money now, the furniture later                      */
/* ------------------------------------------------------------------ */

export interface BookingMailInput {
  to: string
  customerName?: string | null
  bookingNumber: string
  items: MailLine[]
  subtotal: number
  tax: number
  discount: number
  total: number
  /** What they have handed over so far. */
  paid: number
  /** What is still owed. Never stored -- always total minus paid. */
  balance: number
  deliveryDate: string
}

export function bookingConfirmationMail(booking: BookingMailInput): Mail {
  const settled = booking.balance <= 0.005

  const body = `
    <p style="margin:0 0 16px;font-size:16px;color:${bark[900]};">${escape(
      greeting(booking.customerName)
    )}</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${bark[600]};">
      Thank you — your order is booked. Your booking number is
      <strong style="color:${bark[900]};">${escape(booking.bookingNumber)}</strong>.
    </p>

    <!--
      The three facts the customer actually opened this email for, before
      anything else: when it arrives, what they have paid, what they owe.
      Everything below is the detail that backs these up.
    -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${
      bark[100]
    };border-radius:10px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0;font-size:11px;letter-spacing:0.17em;text-transform:uppercase;color:${
            bark[500]
          };">Delivery date</p>
          <p style="margin:4px 0 0;font-size:20px;color:${bark[900]};font-family:Georgia,'Times New Roman',serif;">${escape(
            formatDate(booking.deliveryDate)
          )}</p>
        </td>
        <td style="padding:16px 18px;" align="right">
          <p style="margin:0;font-size:11px;letter-spacing:0.17em;text-transform:uppercase;color:${
            bark[500]
          };">${settled ? 'Paid in full' : 'Balance on delivery'}</p>
          <p style="margin:4px 0 0;font-size:20px;color:${
            bark[900]
          };font-family:Georgia,'Times New Roman',serif;">${escape(
            formatCurrency(settled ? booking.total : booking.balance)
          )}</p>
        </td>
      </tr>
    </table>

    <p style="margin:24px 0 8px;font-size:11px;letter-spacing:0.17em;text-transform:uppercase;color:${
      bark[500]
    };">What you booked</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${itemRows(booking.items)}
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
      ${row('Subtotal', formatCurrency(booking.subtotal))}
      ${booking.discount > 0 ? row('Discount', `-${formatCurrency(booking.discount)}`) : ''}
      ${booking.tax > 0 ? row('Tax', formatCurrency(booking.tax)) : ''}
      ${row('Order total', formatCurrency(booking.total), true)}
      ${row('Advance paid', formatCurrency(booking.paid))}
      ${row('Balance remaining', formatCurrency(booking.balance), true)}
    </table>

    <p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:${bark[600]};">
      ${
        settled
          ? 'This booking is paid in full. We will call before we deliver to agree a time.'
          : `Please keep the balance of <strong style="color:${bark[900]};">${escape(
              formatCurrency(booking.balance)
            )}</strong> ready for the delivery day. We will call beforehand to agree a time.`
      }
      If the date needs to move, tell us as early as you can and we will do our best.
    </p>`

  const text = [
    greeting(booking.customerName),
    '',
    `Thank you — your order is booked. Booking number ${booking.bookingNumber}.`,
    '',
    `Delivery date:     ${formatDate(booking.deliveryDate)}`,
    '',
    'What you booked',
    itemLines(booking.items),
    '',
    `Subtotal           ${formatCurrency(booking.subtotal)}`,
    ...(booking.discount > 0 ? [`Discount           -${formatCurrency(booking.discount)}`] : []),
    ...(booking.tax > 0 ? [`Tax                ${formatCurrency(booking.tax)}`] : []),
    `Order total        ${formatCurrency(booking.total)}`,
    `Advance paid       ${formatCurrency(booking.paid)}`,
    `Balance remaining  ${formatCurrency(booking.balance)}`,
    '',
    settled
      ? 'This booking is paid in full. We will call before we deliver to agree a time.'
      : `Please keep the balance of ${formatCurrency(
          booking.balance
        )} ready for the delivery day. We will call beforehand to agree a time.`,
    textFooter(),
  ].join('\n')

  return {
    to: booking.to,
    subject: settled
      ? `Booked — ${booking.bookingNumber}, delivery ${formatDate(booking.deliveryDate)}`
      : `Booked — ${booking.bookingNumber}, ${formatCurrency(
          booking.balance
        )} due on delivery`,
    text,
    html: layout(`Booking ${booking.bookingNumber}`, body),
  }
}

/** Re-exported so callers import one module. */
export { BRAND_SHORT }
