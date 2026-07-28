import Container from './Container'
import Prose from './Prose'

export interface LegalSection {
  id: string
  heading: string
  body: React.ReactNode
}

export interface LegalPageProps {
  title: string
  lead?: string
  /**
   * A fixed date string, not `new Date()`.
   *
   * Four legal pages rendered `new Date().toLocaleDateString()` as their
   * "Last updated" line, so the document claimed to have been revised on
   * whatever day you happened to read it — and being locale-dependent, it also
   * produced a hydration mismatch between server and client.
   */
  updated: string
  sections: LegalSection[]
}

/**
 * Shared frame for the four policy documents.
 *
 * They previously each hand-rolled their own heading sizes, spacing and list
 * styles inside a Card, at roughly 110 characters per line. Prose caps the
 * measure at ~68 and the table of contents makes a long document navigable.
 */
export default function LegalPage({ title, lead, updated, sections }: LegalPageProps) {
  return (
    <Container size="wide" className="py-section-md">
      <div className="grid gap-12 lg:grid-cols-[16rem_minmax(0,1fr)]">
        {/* Sticky contents. Long legal documents are scanned, not read. */}
        <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
          <h2 className="mb-4 text-caption uppercase tracking-[0.06em] text-text-tertiary">
            On this page
          </h2>
          <ul className="space-y-2 border-l border-border-subtle">
            {sections.map(section => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="-ml-px block border-l border-transparent pl-4 text-ui text-text-secondary transition-colors hover:border-caramel-600 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {section.heading}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <header className="mb-10">
            <h1 className="font-serif text-h1 text-text-primary">{title}</h1>
            {lead && <p className="mt-3 max-w-prose text-body-lg text-text-secondary">{lead}</p>}
            <p className="mt-4 text-caption text-text-tertiary">Last updated {updated}</p>
          </header>

          <Prose>
            {sections.map(section => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2>{section.heading}</h2>
                {section.body}
              </section>
            ))}
          </Prose>
        </div>
      </div>
    </Container>
  )
}
