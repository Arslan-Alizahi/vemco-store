import type { Metadata } from 'next'
import { Hammer, Truck, Users } from 'lucide-react'
import Container from '@/components/layout/Container'
import PageHeader from '@/components/layout/PageHeader'
import Prose from '@/components/layout/Prose'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

export const metadata: Metadata = {
  title: 'Careers',
  description:
    'Vimco Furniture House is not hiring right now. What we look for when we are, and how to reach us in the meantime.',
}

const TEAMS = [
  {
    icon: Hammer,
    title: 'Workshop',
    body: 'Carpenters and finishers. We hire on the work, not the CV — bring photographs of something you have made.',
  },
  {
    icon: Truck,
    title: 'Delivery',
    body: 'Two-person teams who carry furniture into homes and leave the place tidy. Careful beats fast.',
  },
  {
    icon: Users,
    title: 'Showroom',
    body: 'People who would rather talk someone out of the wrong sofa than sell it to them.',
  },
]

export default function CareersPage() {
  return (
    <Container className="py-section-md">
      {/* Leads with the honest status rather than burying it under a wall of
          perks for jobs that do not exist. */}
      <PageHeader
        eyebrow="Careers"
        title="We are not hiring at the moment"
        lead="No open roles today. When that changes we list them here first, before any job board."
        align="center"
      />

      <Prose className="mx-auto mb-14 text-center">
        <p>
          If you want to be considered when something opens, send us your work and a line about
          what you would like to do. We keep applications on file for a year and we do read
          them.
        </p>
      </Prose>

      <div className="mb-14 text-center">
        <Button asChild size="lg">
          <a href="mailto:hj680787@gmail.com">Email hj680787@gmail.com</a>
        </Button>
      </div>

      <section aria-labelledby="teams">
        <h2 id="teams" className="mb-8 text-center font-serif text-h2 text-text-primary">
          The teams we hire into
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {TEAMS.map(team => (
            <Card key={team.title} className="h-full">
              <div className="mb-4 inline-flex rounded-full bg-caramel-100 p-3">
                <team.icon className="h-5 w-5 text-caramel-700" aria-hidden="true" />
              </div>
              <h3 className="mb-2 text-h3 text-text-primary">{team.title}</h3>
              <p className="text-body text-text-secondary">{team.body}</p>
            </Card>
          ))}
        </div>
      </section>
    </Container>
  )
}
