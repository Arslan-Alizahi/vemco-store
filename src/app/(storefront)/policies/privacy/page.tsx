import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage from '@/components/layout/LegalPage'

export const metadata: Metadata = {
  title: 'Privacy policy',
  description:
    'What VEMCO collects, why, who we share it with, and how to get it deleted.',
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      lead="What we collect, why we collect it, and what you can ask us to delete."
      updated="12 June 2026"
      sections={[
        {
          id: 'what-we-collect',
          heading: 'What we collect',
          body: (
            <>
              <p>Only what an order actually needs:</p>
              <ul>
                <li>Your name, phone number and email address</li>
                <li>Delivery and billing addresses, including any access notes you give us</li>
                <li>Order history, so support can answer questions about past purchases</li>
                <li>Messages you send us through the contact form or WhatsApp</li>
              </ul>
              <p>
                <strong>We never see your card details.</strong> Payment is handled entirely by
                our payment processor; the card number does not pass through VEMCO systems and
                is not stored on our servers.
              </p>
            </>
          ),
        },
        {
          id: 'how-we-use-it',
          heading: 'How we use it',
          body: (
            <ul>
              <li>To take payment, schedule delivery and complete your order</li>
              <li>To contact you about that order — dispatch, delivery windows, delays</li>
              <li>To handle warranty claims and returns</li>
              <li>To meet our obligations under Pakistani tax and consumer law</li>
              <li>
                To send occasional marketing, <strong>only if you opted in</strong>, with an
                unsubscribe link in every message
              </li>
            </ul>
          ),
        },
        {
          id: 'who-we-share-with',
          heading: 'Who we share it with',
          body: (
            <>
              <p>
                We do not sell your data. We share the minimum necessary with the people who
                help us complete an order:
              </p>
              <ul>
                <li>Our payment processor, to take payment</li>
                <li>Delivery partners, who receive your address and phone number only</li>
                <li>Our accountants and, where the law requires it, tax authorities</li>
              </ul>
            </>
          ),
        },
        {
          id: 'how-long-we-keep-it',
          heading: 'How long we keep it',
          body: (
            <p>
              Order records are kept for seven years, because tax law requires it. Marketing
              consent is kept until you withdraw it. Contact-form messages are deleted after two
              years. Everything else is removed when you ask.
            </p>
          ),
        },
        {
          id: 'your-choices',
          heading: 'Your choices',
          body: (
            <>
              <p>You can ask us to:</p>
              <ul>
                <li>Send you a copy of what we hold about you</li>
                <li>Correct anything that is wrong</li>
                <li>Delete your data, except records we are legally required to keep</li>
                <li>Stop sending you marketing, at any time</li>
              </ul>
              <p>
                Email <a href="mailto:privacy@vemco.pk">privacy@vemco.pk</a> and we will respond
                within 30 days.
              </p>
            </>
          ),
        },
        {
          id: 'cookies',
          heading: 'Cookies',
          body: (
            <p>
              We use cookies to keep your cart between visits and to understand which pages
              people use. See the <Link href="/policies/cookies">cookie policy</Link> for the
              detail.
            </p>
          ),
        },
        {
          id: 'contact',
          heading: 'Contact',
          body: (
            <p>
              Questions about this policy go to{' '}
              <a href="mailto:privacy@vemco.pk">privacy@vemco.pk</a>, or write to VEMCO,
              Showroom 14, Gulberg III, Lahore.
            </p>
          ),
        },
      ]}
    />
  )
}
