import type { Metadata } from 'next'
import Link from 'next/link'
import Container from '@/components/layout/Container'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import FaqAccordion, { type FaqCategory, type FaqItem } from '@/components/storefront/FaqAccordion'

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Answers on Vimco Furniture House delivery, payment, returns, warranty and made-to-order timescales.',
}

const CATEGORIES: FaqCategory[] = [
  { id: 'ordering', name: 'Ordering' },
  { id: 'delivery', name: 'Delivery' },
  { id: 'payment', name: 'Payment' },
  { id: 'returns', name: 'Returns' },
  { id: 'care', name: 'Care' },
]

const FAQS: FaqItem[] = [
  {
    id: 'order-how',
    category: 'ordering',
    question: 'How do I place an order?',
    answer:
      'Add what you want to the cart and check out. You will get a confirmation email with your order number, and a call from our delivery team once the piece is picked.',
  },
  {
    id: 'order-change',
    category: 'ordering',
    question: 'Can I change or cancel my order?',
    answer:
      'Yes, any time before dispatch — email hj680787@gmail.com with your order number. Made-to-order pieces can be cancelled free until production starts, and we tell you in writing before that happens.',
  },
  {
    id: 'order-stock',
    category: 'ordering',
    question: 'Is everything on the site in stock?',
    answer:
      'Stock levels are live on each listing. If a piece is made to order it says so, along with the 3 to 4 week lead time.',
  },
  {
    id: 'delivery-time',
    category: 'delivery',
    question: 'How long does delivery take?',
    answer:
      'Three to five working days in Lahore, Karachi and Islamabad. Seven to ten upcountry. Made-to-order pieces ship 3 to 4 weeks after the order is confirmed.',
  },
  {
    id: 'delivery-free',
    category: 'delivery',
    question: 'Do you offer free delivery?',
    answer:
      'Free city delivery on orders over Rs 100,000 in Lahore, Karachi and Islamabad, applied automatically at checkout. Upcountry is a flat Rs 7,500.',
  },
  {
    id: 'delivery-room',
    category: 'delivery',
    question: 'Will you carry it into the room?',
    answer:
      'With room-of-choice delivery, yes — carried in, unwrapped, and the packaging taken away with us. Standard city delivery is to your door.',
  },
  {
    id: 'delivery-fit',
    category: 'delivery',
    question: 'What if it does not fit through my door?',
    answer:
      'Check the dimensions and the doorway clearance note on the listing before ordering, and measure the narrowest point on the route — usually a stairwell turn, not the front door. If it will not go in we take it back, but the delivery charge still applies.',
  },
  {
    id: 'payment-methods',
    category: 'payment',
    question: 'What payment methods do you accept?',
    answer:
      'Card, bank transfer, and cash on delivery within Lahore. Card payments are handled by our payment processor; we never see or store your card number.',
  },
  {
    id: 'payment-when',
    category: 'payment',
    question: 'When am I charged?',
    answer:
      'At checkout. For made-to-order pieces we take payment up front, because production starts on your specification.',
  },
  {
    id: 'returns-window',
    category: 'returns',
    question: 'What is your returns policy?',
    answer:
      'Fourteen days from delivery on stock items, in original condition and packaging. Collection is charged at your area delivery rate and deducted from the refund. Made-to-order pieces cannot be returned unless faulty.',
  },
  {
    id: 'returns-faulty',
    category: 'returns',
    question: 'What if something arrives damaged?',
    answer:
      'Tell the delivery team before they leave, or send photographs to hj680787@gmail.com within 48 hours. We collect at our cost and repair, replace or refund. There is no charge to you either way.',
  },
  {
    id: 'returns-warranty',
    category: 'returns',
    question: 'What does the warranty cover?',
    answer:
      'Five years on structure — frames, joints and load-bearing parts under normal domestic use. It does not cover fabric wear, sun fading, accidental damage or commercial use.',
  },
  {
    id: 'care-wood',
    category: 'care',
    question: 'How do I look after oiled timber?',
    answer:
      'Wipe with a damp cloth and dry it, then re-oil once or twice a year with a hardwax oil. Scratches buff out at home, which is the advantage of oil over lacquer.',
  },
  {
    id: 'care-movement',
    category: 'care',
    question: 'The wood has moved slightly. Is that a fault?',
    answer:
      'No. Solid timber expands and contracts with humidity, and Pakistani summers and winters are far apart. Small seasonal movement in a panel is normal and expected.',
  },
]

export default function FAQPage() {
  return (
    <Container size="prose" className="py-section-md">
      <PageHeader
        eyebrow="Help"
        title="Questions we get asked"
        lead="If yours is not here, we would rather you asked than guessed."
        align="center"
      />

      <FaqAccordion items={FAQS} categories={CATEGORIES} />

      <div className="mt-12 rounded-md bg-surface p-8 text-center shadow-e0">
        <h2 className="mb-2 text-h3 text-text-primary">Still not sure?</h2>
        <p className="mb-6 text-body text-text-secondary">
          Tell us about the room and we will tell you honestly whether we have the right piece.
        </p>
        <Button asChild>
          <Link href="/contact">Ask us</Link>
        </Button>
      </div>
    </Container>
  )
}
