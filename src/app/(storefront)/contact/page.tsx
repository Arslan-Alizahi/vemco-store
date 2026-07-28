import type { Metadata } from 'next'
import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import Container from '@/components/layout/Container'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import ContactForm from '@/components/storefront/ContactForm'

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Reach VEMCO by phone, email or WhatsApp, or visit the showroom in Gulberg III, Lahore.',
}

const DETAILS = [
  {
    icon: Phone,
    label: 'Phone',
    value: '+92 42 3500 0000',
    href: 'tel:+924235000000',
    note: 'Mon-Sat, 10am to 8pm',
  },
  {
    icon: Mail,
    label: 'Email',
    value: 'hello@vemco.pk',
    href: 'mailto:hello@vemco.pk',
    note: 'We reply within one working day',
  },
  {
    icon: MapPin,
    label: 'Showroom',
    value: 'Showroom 14, Gulberg III, Lahore',
    href: null,
    note: 'Open seven days, 11am to 8pm',
  },
  {
    icon: Clock,
    label: 'Deliveries',
    value: 'Mon-Sat',
    href: null,
    note: 'Two-hour window confirmed the day before',
  },
]

export default function ContactPage() {
  return (
    <Container className="py-section-md">
      <PageHeader
        eyebrow="Contact"
        title="Talk to us"
        lead="Tell us about the room. We would rather talk you out of the wrong piece than sell it to you."
        align="center"
      />

      <div className="grid gap-8 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-12">
        <aside>
          <ul className="space-y-6">
            {DETAILS.map(detail => (
              <li key={detail.label} className="flex gap-4">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-caramel-100">
                  <detail.icon className="h-4 w-4 text-caramel-700" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-caption uppercase tracking-[0.06em] text-text-tertiary">
                    {detail.label}
                  </p>
                  {detail.href ? (
                    <a
                      href={detail.href}
                      className="block rounded-sm text-body font-medium text-text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {detail.value}
                    </a>
                  ) : (
                    <p className="text-body font-medium text-text-primary">{detail.value}</p>
                  )}
                  <p className="mt-0.5 text-caption text-text-tertiary">{detail.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <Card className="p-6 sm:p-8">
          <h2 className="mb-6 text-h3 text-text-primary">Send a message</h2>
          <ContactForm />
        </Card>
      </div>
    </Container>
  )
}
