import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage from '@/components/layout/LegalPage'

export const metadata: Metadata = {
  title: 'Cookie policy',
  description: 'The cookies Vimo Furniture House sets, what each one does, and how to turn them off.',
}

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie policy"
      lead="Which cookies we set, what each one actually does, and how to switch them off."
      updated="12 June 2026"
      sections={[
        {
          id: 'what-they-are',
          heading: 'What cookies are',
          body: (
            <p>
              Small text files a site stores in your browser. Some are needed for the site to
              work at all; the rest are optional and you can refuse them without losing
              anything important.
            </p>
          ),
        },
        {
          id: 'what-we-set',
          heading: 'What we set',
          body: (
            <>
              <p>
                <strong>Strictly necessary.</strong> Your cart contents and saved items, so they
                survive a refresh, and a session cookie during checkout so payment can complete.
                These cannot be turned off without breaking the store.
              </p>
              <p>
                <strong>Analytics.</strong> Aggregate counts of which pages are visited and
                which products are viewed. We use this to decide what to stock. It is not tied
                to your name and we do not sell it.
              </p>
              <p>
                <strong>Marketing.</strong> Only set if you accept them. Used to measure whether
                an advert led to a sale.
              </p>
            </>
          ),
        },
        {
          id: 'third-parties',
          heading: 'Third parties',
          body: (
            <p>
              Our payment processor sets its own cookies during checkout to detect fraud. Those
              are governed by its policy, not ours, and we cannot switch them off — payment
              would stop working.
            </p>
          ),
        },
        {
          id: 'turning-them-off',
          heading: 'Turning them off',
          body: (
            <>
              <p>
                Every browser lets you block or delete cookies in its settings, usually under
                Privacy. Blocking all cookies will empty your cart between visits and may
                prevent checkout from completing.
              </p>
              <p>
                Blocking analytics and marketing cookies has no effect on browsing or buying.
              </p>
            </>
          ),
        },
        {
          id: 'contact',
          heading: 'Contact',
          body: (
            <p>
              Questions go to <a href="mailto:privacy@vimofurniture.pk">privacy@vimofurniture.pk</a>. See also
              our <Link href="/policies/privacy">privacy policy</Link>.
            </p>
          ),
        },
      ]}
    />
  )
}
