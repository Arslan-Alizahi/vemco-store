import type { Metadata } from 'next'
import { absoluteUrl, SITE_NAME } from '@/lib/site'

/**
 * The catalogue's own title and description.
 *
 * It lives in a layout because the page itself is a client component -- it
 * reads search params, filters and paginates in the browser -- and a client
 * component cannot export metadata. Without this the shop's single most
 * shared page inherited the site default, so every link to it said the same
 * thing as a link to the home page.
 *
 * The product page underneath supplies its own, which wins over this.
 */
export const metadata: Metadata = {
  title: 'All furniture',
  description:
    `Every piece ${SITE_NAME} makes: sofas and seating, beds, dining tables, ` +
    'coffee tables and storage. Solid wood, full dimensions on every listing, ' +
    'and a doorway clearance note so you know it fits before you order.',
  alternates: { canonical: absoluteUrl('/products') },
  openGraph: {
    title: `All furniture — ${SITE_NAME}`,
    description:
      'Sofas, beds, dining, tables and storage in solid wood — with full dimensions on every piece.',
    url: absoluteUrl('/products'),
  },
}

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
