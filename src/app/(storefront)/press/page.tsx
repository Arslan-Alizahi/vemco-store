import type { Metadata } from 'next'
import Container from '@/components/layout/Container'
import PageHeader from '@/components/layout/PageHeader'
import Prose from '@/components/layout/Prose'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

export const metadata: Metadata = {
  title: 'Press',
  description: 'Company facts, brand assets and press contact for Vimo Furniture House.',
}

const FACTS = [
  ['Founded', '2024'],
  ['Head office', 'Lahore, Punjab'],
  ['Showroom', 'Gulberg III, Lahore'],
  ['Delivers to', 'All major cities in Pakistan'],
]

export default function PressPage() {
  return (
    <Container size="prose" className="py-section-md">
      <PageHeader
        eyebrow="Press"
        title="Press and media"
        lead="Facts, assets and a direct line — no form in between."
      />

      <Prose>
        <h2>About Vimo Furniture House</h2>
        <p>
          Vimo Furniture House makes and sells solid wood furniture for the Pakistani market. We publish full
          dimensions and materials on every listing, deliver into the room of your choice, and
          back the structure of every piece for five years.
        </p>
        <p>
          We are not a marketplace and we do not dropship. What we sell, we stand behind.
        </p>
      </Prose>

      <Card className="my-10">
        <h2 className="mb-5 text-h3 text-text-primary">Company facts</h2>
        <dl className="divide-y divide-border-subtle">
          {FACTS.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-6 py-3">
              <dt className="text-ui text-text-secondary">{label}</dt>
              <dd className="text-ui font-medium text-text-primary">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Prose>
        <h2>Brand assets</h2>
        <p>
          We do not host a downloadable press kit. Tell us what you need — logo files,
          photography, a quote — and we will send it directly, which is faster than maintaining
          a zip nobody keeps current.
        </p>

        <h2>Press contact</h2>
        <p>
          <a href="mailto:press@vimofurniture.pk">press@vimofurniture.pk</a> — we reply within one working day.
          For anything on deadline, say so in the subject line.
        </p>
      </Prose>

      <div className="mt-10">
        <Button asChild>
          <a href="mailto:press@vimofurniture.pk">Email press@vimofurniture.pk</a>
        </Button>
      </div>
    </Container>
  )
}
