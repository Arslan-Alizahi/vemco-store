import type { Metadata } from 'next'
import { Check, CircleDashed } from 'lucide-react'
import Container from '@/components/layout/Container'
import PageHeader from '@/components/layout/PageHeader'
import Prose from '@/components/layout/Prose'

export const metadata: Metadata = {
  title: 'Accessibility',
  description:
    'What is accessible on the Vimo Furniture House site today, what is not yet, and how to tell us when something blocks you.',
}

const DONE = [
  'Every colour pairing meets WCAG AA contrast, checked automatically on each build',
  'A skip link, page landmarks, and a single main region on every page',
  'Form fields have real labels, and errors are announced rather than only shown',
  'Focus is visible on keyboard navigation and stays out of the way of mouse users',
  'Dialogs trap focus, close on Escape, and return focus where it came from',
  'Motion respects the reduce-motion setting, and carousels never autoplay under it',
  'Interactive controls are at least 44 by 44 pixels',
]

const NOT_YET = [
  'The product gallery has not been tested end to end with a screen reader',
  'The point-of-sale screen has no keyboard shortcuts for fast repeated use',
  'The admin data tables are not yet usable at 320 pixels wide',
  'Product images use the product name as alt text rather than a written description',
]

export default function AccessibilityPage() {
  return (
    <Container size="prose" className="py-section-md">
      <PageHeader
        eyebrow="Accessibility"
        title="Accessibility at Vimo Furniture House"
        lead="An honest account of where this site stands, rather than a badge."
      />

      <Prose>
        <p>
          This page used to claim full WCAG 2.1 AA conformance. That was not accurate, so it has
          been replaced with a list of what is actually done and what is not. We would rather
          you knew which parts might give you trouble than found out the hard way.
        </p>
      </Prose>

      <section aria-labelledby="done" className="mt-12">
        <h2 id="done" className="mb-5 font-serif text-h2 text-text-primary">
          What works today
        </h2>
        <ul className="space-y-3">
          {DONE.map(item => (
            <li key={item} className="flex gap-3">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-success-600" aria-hidden="true" />
              <span className="text-body text-text-secondary">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="not-yet" className="mt-12">
        <h2 id="not-yet" className="mb-5 font-serif text-h2 text-text-primary">
          What is not done yet
        </h2>
        <ul className="space-y-3">
          {NOT_YET.map(item => (
            <li key={item} className="flex gap-3">
              <CircleDashed
                className="mt-0.5 h-5 w-5 shrink-0 text-text-tertiary"
                aria-hidden="true"
              />
              <span className="text-body text-text-secondary">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <Prose className="mt-12">
        <h2>If something blocks you</h2>
        <p>
          Email <a href="mailto:access@vimofurniture.pk">access@vimofurniture.pk</a> or call{' '}
          <a href="tel:+924235000000">+92 42 3500 0000</a>. Tell us the page and what happened —
          you do not need to know the technical term for it.
        </p>
        <p>
          If the website is in your way, we will take the order over the phone, and you will not
          lose any offer or price by doing it that way.
        </p>
      </Prose>
    </Container>
  )
}
