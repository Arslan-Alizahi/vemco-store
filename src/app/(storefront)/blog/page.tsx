import type { Metadata } from 'next'
import Link from 'next/link'
import Container from '@/components/layout/Container'
import PageHeader from '@/components/layout/PageHeader'
import Prose from '@/components/layout/Prose'
import Button from '@/components/ui/Button'

export const metadata: Metadata = {
  title: 'Journal',
  description:
    'Not published yet. What the VEMCO journal will cover — materials, joinery and buying furniture that lasts.',
}

export default function BlogPage() {
  return (
    <Container size="prose" className="py-section-md">
      {/* The old page showed three half-opacity placeholder cards with invented
          titles, which reads as broken content rather than as "not yet". */}
      <PageHeader
        eyebrow="Journal"
        title="Nothing published yet"
        lead="We would rather have no journal than one padded with filler."
        align="center"
      />

      <Prose className="mx-auto text-center">
        <p>When it does start, it will cover the things that actually decide whether furniture lasts:</p>
        <ul className="text-left">
          <li>How to read a specification — what solid wood, veneer and engineered board each mean</li>
          <li>Joinery worth paying for, and where it does not matter</li>
          <li>Measuring a room and a stairwell before you order</li>
          <li>Caring for oiled timber and natural fabrics in a Pakistani climate</li>
        </ul>
      </Prose>

      <div className="mt-10 text-center">
        <Button asChild variant="outline">
          <Link href="/contact">Ask us something instead</Link>
        </Button>
      </div>
    </Container>
  )
}
