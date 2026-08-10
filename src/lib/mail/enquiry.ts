import { bark } from '@/design/tokens'
import { BRAND_ADDRESS, BRAND_PHONES, BRAND_SHORT } from '@/lib/brand'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Mail } from './transport'
import {
  escape,
  greeting,
  itemLines,
  itemRows,
  layout,
  row,
  textFooter,
  type MailLine,
} from './templates'

/**
 * The two messages an enquiry sends: one to the customer, one to the shop.
 *
 * Nothing has been paid and nothing is held, so neither of these is a
 * receipt. They exist to get a telephone call to happen -- the customer's
 * copy carries the reference and the numbers so the instruction survives
 * closing the browser tab, and the shop's copy puts a name and a tappable
 * number at the very top where they can be acted on without reading
 * anything else.
 */

export interface EnquiryMailInput {
  to: string
  enquiry: {
    reference: string
    intent: 'visit' | 'reserve' | 'delivery'
    customer_name: string
    customer_phone: string
    customer_email?: string | null
    city?: string | null
    visit_date?: string | null
    message?: string | null
    items_total: number
    items: MailLine[]
  }
}

type Intent = EnquiryMailInput['enquiry']['intent']

/** What each of the three conversations is called, in the shop's own words. */
export const INTENT_LABEL: Record<Intent, string> = {
  visit: 'Showroom visit',
  reserve: 'Reserve a piece',
  delivery: 'Buy and have it delivered',
}

/**
 * What the customer is asked to do next, spelled out.
 *
 * The whole flow ends on a telephone call, so this is the most important
 * paragraph in the system. It says which number to ring, what to say, and --
 * for the intents where somebody might otherwise lose the piece -- states
 * plainly that an enquiry does not hold it and an advance does. Leaving that
 * unsaid is how a customer comes back in three days to find the sofa sold
 * and blames the shop for a promise the shop never made.
 */
export const NEXT_STEP: Record<Intent, string> = {
  visit:
    'Ring either number below and tell us the day you would like to come, quoting your reference. If you would rather the piece were not sold before you get here, you can pay an advance over the phone or at the shop and we will hold it for you — and if it is not what you expected when you see it, that advance comes straight back to you.',
  reserve:
    'Ring either number below quoting your reference and we will go through the piece with you. An enquiry on its own does not hold anything: a piece is held once an advance is paid, and until then it stays on the floor for anyone to buy.',
  delivery:
    'Ring either number below quoting your reference. We will confirm the price, agree how you would like to pay, and fix a delivery day with you.',
}

const telHrefOf = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`

/** Both lines, as one tappable block. Paper cannot be tapped; email can. */
const phoneBlock = () =>
  BRAND_PHONES.map(
    phone =>
      `<a href="${telHrefOf(phone)}" style="display:inline-block;margin:0 14px 8px 0;font-size:19px;color:${
        bark[900]
      };font-family:Georgia,'Times New Roman',serif;">${escape(phone)}</a>`
  ).join('')

export function enquiryReceivedMail({ to, enquiry }: EnquiryMailInput): Mail {
  const body = `
    <p style="margin:0 0 16px;font-size:16px;color:${bark[900]};">${escape(
      greeting(enquiry.customer_name)
    )}</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${bark[600]};">
      Thank you for getting in touch. Your reference is
      <strong style="color:${bark[900]};">${escape(enquiry.reference)}</strong> — quote it
      when you ring and we will have your enquiry in front of us.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${
      bark[100]
    };border-radius:10px;">
      <tr><td style="padding:18px;">
        <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.17em;text-transform:uppercase;color:${
          bark[500]
        };">Call us on</p>
        ${phoneBlock()}
        <p style="margin:8px 0 0;font-size:13px;line-height:1.6;color:${bark[600]};">${escape(
          BRAND_ADDRESS
        )}</p>
      </td></tr>
    </table>

    <p style="margin:20px 0 0;font-size:15px;line-height:1.6;color:${bark[600]};">${escape(
      NEXT_STEP[enquiry.intent]
    )}</p>

    <p style="margin:24px 0 8px;font-size:11px;letter-spacing:0.17em;text-transform:uppercase;color:${
      bark[500]
    };">What you asked about</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${itemRows(enquiry.items)}
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
      ${row('Listed at', formatCurrency(enquiry.items_total), true)}
    </table>
    <p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:${bark[500]};">
      Nothing has been charged and nothing is being held. This is the shelf price of what
      you were looking at; delivery and everything else is agreed on the phone.
    </p>`

  const text = [
    greeting(enquiry.customer_name),
    '',
    `Thank you for getting in touch. Your reference is ${enquiry.reference}.`,
    '',
    'Call us on',
    ...BRAND_PHONES.map(phone => `  ${phone}`),
    `  ${BRAND_ADDRESS}`,
    '',
    NEXT_STEP[enquiry.intent],
    '',
    'What you asked about',
    itemLines(enquiry.items),
    '',
    `Listed at  ${formatCurrency(enquiry.items_total)}`,
    '',
    'Nothing has been charged and nothing is being held.',
    textFooter(),
  ].join('\n')

  return {
    to,
    subject: `${enquiry.reference} — ${INTENT_LABEL[enquiry.intent]}, ${BRAND_SHORT}`,
    text,
    html: layout(`Enquiry ${enquiry.reference}`, body),
  }
}

export function enquiryForShopMail({ to, enquiry }: EnquiryMailInput): Mail {
  const detail: [string, string][] = [
    ['Reference', enquiry.reference],
    ['Wants', INTENT_LABEL[enquiry.intent]],
  ]
  if (enquiry.visit_date) detail.push(['Visit on', formatDate(enquiry.visit_date)])
  if (enquiry.city) detail.push(['City', enquiry.city])
  if (enquiry.customer_email) detail.push(['Email', enquiry.customer_email])

  const body = `
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.17em;text-transform:uppercase;color:${
      bark[500]
    };">New enquiry — call back</p>
    <p style="margin:0 0 4px;font-size:24px;color:${bark[900]};font-family:Georgia,'Times New Roman',serif;">${escape(
      enquiry.customer_name
    )}</p>
    <p style="margin:0 0 20px;"><a href="${telHrefOf(
      enquiry.customer_phone
    )}" style="font-size:22px;color:${bark[900]};font-family:Georgia,'Times New Roman',serif;">${escape(
      enquiry.customer_phone
    )}</a></p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${detail.map(([label, value]) => row(label, value)).join('')}
    </table>

    ${
      enquiry.message
        ? `<p style="margin:20px 0 6px;font-size:11px;letter-spacing:0.17em;text-transform:uppercase;color:${
            bark[500]
          };">They said</p>
    <p style="margin:0;font-size:15px;line-height:1.6;color:${bark[900]};">${escape(
            enquiry.message
          )}</p>`
        : ''
    }

    <p style="margin:24px 0 8px;font-size:11px;letter-spacing:0.17em;text-transform:uppercase;color:${
      bark[500]
    };">Interested in</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${itemRows(enquiry.items)}
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
      ${row('Listed at', formatCurrency(enquiry.items_total), true)}
    </table>`

  const text = [
    'New enquiry — call back',
    '',
    enquiry.customer_name,
    enquiry.customer_phone,
    '',
    ...detail.map(([label, value]) => `${label}: ${value}`),
    ...(enquiry.message ? ['', 'They said:', enquiry.message] : []),
    '',
    'Interested in',
    itemLines(enquiry.items),
    '',
    `Listed at  ${formatCurrency(enquiry.items_total)}`,
  ].join('\n')

  return {
    to,
    subject: `${INTENT_LABEL[enquiry.intent]} — ${enquiry.customer_name}, ${enquiry.customer_phone} (${enquiry.reference})`,
    text,
    html: layout(`Enquiry ${enquiry.reference}`, body),
  }
}
