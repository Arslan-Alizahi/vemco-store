import type { Metadata } from 'next'
import LegalPage from '@/components/layout/LegalPage'

export const metadata: Metadata = {
  title: 'Terms of sale',
  description:
    'The terms you agree to when ordering furniture from VEMCO — pricing, delivery, cancellation and liability.',
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of sale"
      lead="The agreement between you and VEMCO when you place an order."
      updated="12 June 2026"
      sections={[
        {
          id: 'who-we-are',
          heading: 'Who we are',
          body: (
            <p>
              VEMCO is a furniture retailer registered in Pakistan, trading from Showroom 14,
              Gulberg III, Lahore. In these terms, &ldquo;we&rdquo; means VEMCO and
              &ldquo;you&rdquo; means the person placing the order.
            </p>
          ),
        },
        {
          id: 'orders',
          heading: 'Placing an order',
          body: (
            <>
              <p>
                An order is an offer to buy. The contract forms when we send you an order
                confirmation, not when payment is taken.
              </p>
              <p>
                We may decline an order if the item is out of stock, if the price was listed
                incorrectly, or if we cannot deliver to your address. If we decline after taking
                payment, you get a full refund.
              </p>
            </>
          ),
        },
        {
          id: 'pricing',
          heading: 'Pricing',
          body: (
            <>
              <p>
                All prices are in Pakistani rupees and include applicable sales tax. Delivery is
                charged separately and shown before you pay.
              </p>
              <p>
                If a price is obviously wrong — a decimal in the wrong place — we will contact
                you before dispatch rather than silently cancel or charge the correct amount.
              </p>
            </>
          ),
        },
        {
          id: 'delivery',
          heading: 'Delivery',
          body: (
            <>
              <p>
                Delivery estimates are estimates. We will tell you if a date moves, and you may
                cancel for a full refund if a delay is longer than you are willing to accept.
              </p>
              <p>
                <strong>Access is your responsibility.</strong> Measure doorways, stairwells and
                lifts before ordering; every listing carries full dimensions. If a piece cannot
                be brought in, we will take it back, but the delivery charge still applies.
              </p>
              <p>Risk passes to you on delivery. Title passes once payment clears in full.</p>
            </>
          ),
        },
        {
          id: 'cancellation',
          heading: 'Cancellation',
          body: (
            <p>
              You can cancel a stock item any time before dispatch, and within 14 days of
              delivery under our <a href="/policies/returns">returns policy</a>. Made-to-order
              pieces can be cancelled free of charge until production starts.
            </p>
          ),
        },
        {
          id: 'liability',
          heading: 'Liability',
          body: (
            <p>
              We are responsible for loss or damage you suffer that is a foreseeable result of
              us breaking these terms. We are not liable for business losses. Nothing here
              limits liability for death or personal injury caused by our negligence, or for
              fraud — the law does not permit that and we would not want it to.
            </p>
          ),
        },
        {
          id: 'governing-law',
          heading: 'Governing law',
          body: (
            <p>
              These terms are governed by the laws of Pakistan, and the courts of Lahore have
              jurisdiction over any dispute.
            </p>
          ),
        },
      ]}
    />
  )
}
