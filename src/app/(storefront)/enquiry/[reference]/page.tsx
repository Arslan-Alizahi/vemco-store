import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import Container from '@/components/layout/Container'
import Panel, { Eyebrow } from '@/components/layout/Panel'
import Button from '@/components/ui/Button'
import { runGet, runQuery } from '@/lib/db'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  BRAND_ADDRESS,
  BRAND_EMAIL,
  BRAND_NAME,
  BRAND_PHONES,
  telHref,
} from '@/lib/brand'
import { INTENT_LABEL, NEXT_STEP } from '@/lib/mail'
import type { Enquiry, EnquiryLine } from '@/lib/enquiries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Your enquiry',
  description: 'What to do next, and how to reach us.',
  // A page keyed on somebody's reference has no business in search results.
  robots: { index: false, follow: false },
}

/**
 * The page the whole storefront exists to reach.
 *
 * Everything before it is browsing; this is where a visitor becomes a phone
 * call. So it does exactly three things, in this order: gives them the
 * reference to quote, gives them a way to reach a human that is one tap
 * away on the device they are holding, and tells them plainly what happens
 * next -- including the part that protects the shop, which is that an
 * enquiry does not hold anything.
 */
export default async function EnquiryPage({ params }: { params: { reference: string } }) {
  /**
   * Looked up by reference, and only ever for display.
   *
   * The reference is six readable characters, so it is guessable in a way an
   * id is not -- which is why nothing sensitive is on this page. It shows
   * back what the person themselves just typed, and the shop's own public
   * contact details. Somebody who guessed a reference would learn a first
   * name and a list of furniture, and nothing they could act on.
   */
  const enquiry = (await runGet<Enquiry>(
    `SELECT * FROM enquiries WHERE reference = ?`,
    [params.reference.toUpperCase()]
  )) as Enquiry | undefined

  if (!enquiry) notFound()

  const items = await runQuery<EnquiryLine>(
    `SELECT * FROM enquiry_items WHERE enquiry_id = ? ORDER BY id`,
    [enquiry.id]
  )

  /**
   * A WhatsApp message written for them.
   *
   * In this market the call very often starts as a WhatsApp message, and the
   * hardest part of sending one is working out what to say. Pre-filling it
   * with the reference means the shop can find the enquiry from the first
   * message rather than after three of them.
   */
  const whatsappText = encodeURIComponent(
    `Assalam o Alaikum, ${BRAND_NAME}. My enquiry reference is ${enquiry.reference} (${INTENT_LABEL[enquiry.intent]}). My name is ${enquiry.customer_name}.`
  )
  const whatsappHref = `https://wa.me/${BRAND_PHONES[0].replace(/[^\d]/g, '')}?text=${whatsappText}`

  return (
    <Container className="py-section-md">
      <div className="mx-auto max-w-prose space-y-4">
        <Panel pad="lg">
          <Eyebrow>{INTENT_LABEL[enquiry.intent]}</Eyebrow>
          <h1 className="mt-5 font-serif text-h1 text-text-primary">
            Thank you, {enquiry.customer_name.split(' ')[0]}. We have your enquiry.
          </h1>

          {/*
            The reference, given its own block and set large.
            It is the only thing on this page the customer has to carry into
            the phone call, and a reference buried in a paragraph is a
            reference nobody reads out.
          */}
          <div className="mt-7 rounded-md bg-surface-subtle p-5 text-center">
            <p className="text-eyebrow uppercase text-text-tertiary">Quote this when you call</p>
            <p className="mt-2 font-serif text-display text-text-primary">{enquiry.reference}</p>
          </div>

          <p className="mt-7 text-body-lg text-text-secondary">{NEXT_STEP[enquiry.intent]}</p>

          {enquiry.visit_date && (
            <p className="mt-4 text-body text-text-primary">
              You asked to come in on{' '}
              <strong>{formatDate(enquiry.visit_date)}</strong>. Ring us to confirm it —
              that way somebody who knows these pieces is on the floor when you arrive.
            </p>
          )}
        </Panel>

        {/* ---------------------------------------------------------- */}
        {/* How to reach a person. One tap, on the device in their hand. */}
        {/* ---------------------------------------------------------- */}
        <Panel pad="lg">
          <Eyebrow>Reach us</Eyebrow>
          <h2 className="mt-5 font-serif text-h1 text-text-primary">{BRAND_NAME}</h2>

          <ul className="mt-7 space-y-3">
            {BRAND_PHONES.map((phone, index) => (
              <li key={phone}>
                <a
                  href={telHref(phone)}
                  className="flex items-center gap-4 rounded-md border border-border-subtle p-4 transition-colors duration-fast hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  <Phone className="h-5 w-5 shrink-0 text-text-secondary" aria-hidden="true" />
                  <span>
                    <span className="block font-serif text-h2 text-text-primary">{phone}</span>
                    <span className="block text-caption text-text-tertiary">
                      {index === 0 ? 'Main line' : 'If the first line is busy'}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <div className="mt-4">
            <Button
              asChild
              size="lg"
              fullWidth
              leftIcon={<MessageCircle className="h-4 w-4" />}
            >
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                Message us on WhatsApp
              </a>
            </Button>
          </div>

          <dl className="mt-7 space-y-3 border-t border-border-subtle pt-6 text-ui">
            <div className="flex gap-3">
              <dt className="sr-only">Showroom</dt>
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
              <dd className="text-text-secondary">
                {BRAND_ADDRESS}
                <span className="block text-caption text-text-tertiary">
                  Open seven days, 11am to 8pm
                </span>
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="sr-only">Email</dt>
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
              <dd>
                <a
                  href={`mailto:${BRAND_EMAIL}`}
                  className="rounded-sm text-text-secondary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {BRAND_EMAIL}
                </a>
              </dd>
            </div>
          </dl>
        </Panel>

        {/* ---------------------------------------------------------- */}
        {/* What they asked about.                                      */}
        {/* ---------------------------------------------------------- */}
        <Panel pad="lg">
          <Eyebrow>What you asked about</Eyebrow>
          <ul className="mt-5 divide-y divide-border-subtle">
            {items.map(item => (
              <li key={item.product_name} className="flex justify-between gap-4 py-3">
                <span className="text-body text-text-primary">
                  {item.product_name}
                  {item.quantity > 1 && (
                    <span className="text-text-secondary"> ×{item.quantity}</span>
                  )}
                </span>
                <span className="shrink-0 text-body tabular-nums text-text-primary">
                  {formatCurrency(item.subtotal)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex justify-between border-t border-border-strong pt-4">
            <span className="text-body font-medium text-text-primary">Listed at</span>
            <span className="text-h3 tabular-nums text-text-primary">
              {formatCurrency(enquiry.items_total)}
            </span>
          </div>

          {/*
            Said once, plainly, on the page the customer will remember.
            Everything else here is warm; this line is not, because the one
            way this flow can go wrong for a customer is that they assume a
            form held the sofa and come back on Saturday to find it sold.
          */}
          <p className="mt-5 text-ui text-text-secondary">
            Nothing has been charged and nothing is being held. This is the shelf price of
            what you were looking at — delivery and anything else is agreed on the phone.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="outline">
              <Link href="/products">Keep browsing</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/cart">Back to your list</Link>
            </Button>
          </div>
        </Panel>
      </div>
    </Container>
  )
}
