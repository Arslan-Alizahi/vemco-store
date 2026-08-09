import type { Metadata } from 'next'
import LegalPage from '@/components/layout/LegalPage'

export const metadata: Metadata = {
  title: 'Returns and refunds',
  description:
    'Fourteen days to change your mind on stock furniture, and how warranty claims work.',
}

export default function ReturnsPage() {
  return (
    <LegalPage
      title="Returns and refunds"
      lead="Furniture is expensive and hard to move. Here is exactly where you stand before you buy."
      updated="12 June 2026"
      sections={[
        {
          id: 'changing-your-mind',
          heading: 'Changing your mind',
          body: (
            <>
              <p>
                You have <strong>14 days from delivery</strong> to return a stock item for a
                refund. It has to come back in the condition it arrived in — unmarked, and in
                its original packaging, which is why we ask you to keep the packaging until you
                are sure.
              </p>
              <p>
                Collection is charged at the delivery rate for your area, and that fee is
                deducted from the refund.
              </p>
            </>
          ),
        },
        {
          id: 'what-cannot-be-returned',
          heading: 'What cannot be returned',
          body: (
            <>
              <ul>
                <li>
                  <strong>Made-to-order pieces.</strong> Anything built to your fabric, size or
                  finish is yours once production starts. We confirm that in writing before we
                  begin, and you can cancel free of charge until then.
                </li>
                <li>Items marked clearance or ex-display at the point of sale</li>
                <li>Anything assembled or modified after delivery</li>
              </ul>
              <p>None of this affects your rights if an item turns out to be faulty.</p>
            </>
          ),
        },
        {
          id: 'faulty-or-damaged',
          heading: 'Faulty or damaged on arrival',
          body: (
            <>
              <p>
                Check your delivery before the team leaves. If something is damaged, tell them
                and they will note it there and then.
              </p>
              <p>
                If you find a problem later, send photographs to{' '}
                <a href="mailto:hj680787@gmail.com">hj680787@gmail.com</a> within 48 hours. We
                collect at our cost and either repair, replace or refund. There is no charge to
                you either way.
              </p>
            </>
          ),
        },
        {
          id: 'warranty',
          heading: 'Warranty',
          body: (
            <>
              <p>
                Every piece carries a <strong>five-year structural warranty</strong> — frames,
                joints and load-bearing components under normal domestic use.
              </p>
              <p>
                Not covered: fabric wear, fading from direct sunlight, accidental damage, or
                commercial use.
              </p>
              <p>
                Timber moves with humidity. Small seasonal changes in a solid wood panel are
                normal and are not a fault.
              </p>
            </>
          ),
        },
        {
          id: 'how-refunds-work',
          heading: 'How refunds work',
          body: (
            <p>
              Refunds go back to the original payment method within 7 to 10 working days of the
              item reaching us and passing inspection. Bank transfers can take a few days longer
              to appear.
            </p>
          ),
        },
        {
          id: 'starting-a-return',
          heading: 'Starting a return',
          body: (
            <p>
              Email <a href="mailto:hj680787@gmail.com">hj680787@gmail.com</a> with your order
              number and what you would like to do. We reply within one working day and arrange
              collection from there.
            </p>
          ),
        },
      ]}
    />
  )
}
