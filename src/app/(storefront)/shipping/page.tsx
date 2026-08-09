import type { Metadata } from 'next'
import { MapPin, Package, Truck } from 'lucide-react'
import Container from '@/components/layout/Container'
import PageHeader from '@/components/layout/PageHeader'
import Prose from '@/components/layout/Prose'
import Card from '@/components/ui/Card'
import Money from '@/components/ui/Money'

export const metadata: Metadata = {
  title: 'Delivery',
  description:
    'Vimco Furniture House delivery rates and timescales across Pakistan, including room-of-choice delivery and access requirements.',
}

const TIERS = [
  {
    icon: Truck,
    name: 'City delivery',
    days: '3-5 working days',
    price: 2500,
    note: 'Free on orders over Rs 100,000',
  },
  {
    icon: Package,
    name: 'Room of choice',
    days: '3-5 working days',
    price: 4500,
    note: 'Carried in, unwrapped, packaging taken away',
    featured: true,
  },
  {
    icon: MapPin,
    name: 'Upcountry',
    days: '7-10 working days',
    price: 7500,
    note: 'Outside Lahore, Karachi and Islamabad',
  },
]

const ZONES = [
  {
    title: 'Lahore, Karachi and Islamabad',
    body: 'Our own delivery teams, with a two-hour arrival window confirmed the day before.',
  },
  {
    title: 'Rest of Punjab and Sindh',
    body: 'Rawalpindi, Faisalabad, Multan, Hyderabad, Sialkot and Gujranwala on a weekly run.',
  },
  {
    title: 'KP, Balochistan and AJK',
    body: 'Through a freight partner. Larger pieces are crated, and we call to confirm access before dispatch.',
  },
]

export default function ShippingPage() {
  return (
    <Container className="py-section-md">
      <PageHeader
        eyebrow="Delivery"
        title="Getting it to you"
        lead="What it costs, how long it takes, and the one thing we need you to check first."
      />

      <div className="mb-14 grid gap-6 sm:grid-cols-3">
        {TIERS.map(tier => (
          <Card
            key={tier.name}
            className={tier.featured ? 'h-full ring-1 ring-caramel-600' : 'h-full'}
          >
            <div className="mb-4 inline-flex rounded-full bg-caramel-100 p-3">
              <tier.icon className="h-5 w-5 text-caramel-700" aria-hidden="true" />
            </div>
            <h2 className="mb-1 text-h3 text-text-primary">{tier.name}</h2>
            <p className="mb-4 text-ui text-text-secondary">{tier.days}</p>
            <Money amount={tier.price} className="block text-h2 text-text-primary" />
            <p className="mt-2 text-caption text-text-tertiary">{tier.note}</p>
          </Card>
        ))}
      </div>

      <section aria-labelledby="zones" className="mb-14">
        <h2 id="zones" className="mb-6 font-serif text-h2 text-text-primary">
          Where we deliver
        </h2>
        <dl className="divide-y divide-border-subtle border-y border-border-subtle">
          {ZONES.map(zone => (
            <div key={zone.title} className="grid gap-2 py-5 sm:grid-cols-[16rem_minmax(0,1fr)]">
              <dt className="text-body font-medium text-text-primary">{zone.title}</dt>
              <dd className="text-body text-text-secondary">{zone.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <Prose>
        <h2>Measure before you order</h2>
        <p>
          This is the one thing that goes wrong, and it is avoidable. Every listing carries full
          dimensions and a doorway clearance figure. Check the narrowest point on the route —
          usually a stairwell turn or a lift, not the front door.
        </p>
        <p>
          If a piece will not go in, we take it away again, but the delivery charge still
          applies. Ask us first if you are unsure; we would rather answer a question than
          collect a sofa.
        </p>

        <h2>Timing</h2>
        <ul>
          <li>Orders placed before 3 PM PKT are picked the same day</li>
          <li>Orders after 3 PM PKT are picked the next working day</li>
          <li>Friday afternoon and Sunday orders are picked on Monday</li>
          <li>Made-to-order pieces take 3 to 4 weeks before dispatch</li>
        </ul>

        <h2>On the day</h2>
        <p>
          You get a call the day before with a two-hour window, and another when the team sets
          off. Please check the piece before they leave — anything noted on the spot is resolved
          faster than a photograph sent later.
        </p>
      </Prose>
    </Container>
  )
}
