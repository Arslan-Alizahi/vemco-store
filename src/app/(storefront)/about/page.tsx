import type { Metadata } from 'next'
import Link from 'next/link'
import { Hammer, Ruler, Trees, Truck } from 'lucide-react'
import Container from '@/components/layout/Container'
import PageHeader from '@/components/layout/PageHeader'
import Prose from '@/components/layout/Prose'
import Section from '@/components/layout/Section'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Vimco Furniture House makes solid wood furniture in Haripur, publishes full specifications, and backs the structure for five years.',
}

const PRINCIPLES = [
  {
    icon: Trees,
    title: 'Solid wood',
    body: 'No veneer over particleboard where it matters. What you see on the edge is what the piece is made of.',
  },
  {
    icon: Hammer,
    title: 'Real joinery',
    body: 'Mortise and tenon, corner blocks, dowels. Staples and glue alone do not keep a frame square for twenty years.',
  },
  {
    icon: Ruler,
    title: 'Full specifications',
    body: 'Every listing carries dimensions, materials and a doorway clearance note, before you pay rather than after.',
  },
  {
    icon: Truck,
    title: 'Delivered properly',
    body: 'Carried into the room you want it in, unwrapped, and the packaging taken away with us.',
  },
]

export default function AboutPage() {
  return (
    <>
      <Container className="pt-section-md">
        <PageHeader
          eyebrow="About Vimco Furniture House"
          title="Furniture that outlasts the room you bought it for"
          lead="We build in Haripur, sell direct, and tell you what a piece is actually made of."
          align="center"
        />

        <Prose className="mx-auto">
          <p>
            Most furniture sold online in Pakistan is described in adjectives. Premium. Luxury.
            Imported. None of those words tell you whether a frame is kiln-dried hardwood or
            stapled particleboard, and that difference decides whether a sofa lasts five years
            or twenty.
          </p>
          <p>
            So we publish the specification instead. Timber species, joint type, foam density,
            fabric rub count, every dimension including the one that matters most — whether it
            fits through your door.
          </p>
          <p>
            We sell direct from our own workshop and a single showroom in Haripur. No
            middlemen, which is the only reason the pricing works at this level of
            construction.
          </p>
        </Prose>
      </Container>

      <Section spacing="md">
        <Container>
          <h2 className="mb-8 text-center font-serif text-h2 text-text-primary">
            What we hold ourselves to
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PRINCIPLES.map(principle => (
              <Card key={principle.title} className="h-full">
                <div className="mb-4 inline-flex rounded-full bg-caramel-100 p-3">
                  <principle.icon className="h-5 w-5 text-caramel-700" aria-hidden="true" />
                </div>
                <h3 className="mb-2 text-h3 text-text-primary">{principle.title}</h3>
                <p className="text-body text-text-secondary">{principle.body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <Section spacing="md" className="bg-surface-inverse text-bark-50">
        <Container size="prose" className="text-center">
          <h2 className="mb-4 font-serif text-h1">Come and sit on it</h2>
          <p className="mb-8 text-body-lg text-bark-200">
            Photographs only go so far. The showroom is open seven days a week on Dhindhiyan Road, Haripur,
            and nobody there works on commission.
          </p>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-bark-400 text-bark-50 hover:bg-bark-800"
          >
            <Link href="/contact">Get directions</Link>
          </Button>
        </Container>
      </Section>
    </>
  )
}
