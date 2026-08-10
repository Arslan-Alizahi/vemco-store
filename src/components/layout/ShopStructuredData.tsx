import {
  BRAND_ADDRESS,
  BRAND_EMAIL,
  BRAND_NAME,
  BRAND_PHONES,
} from '@/lib/brand'
import { SITE_DESCRIPTION, SITE_URL, absoluteUrl } from '@/lib/site'

/**
 * The shop, described in the vocabulary search engines actually read.
 *
 * This is the highest-value piece of SEO a shop like this has, and it has
 * nothing to do with keywords. Somebody in Haripur searching "furniture shop
 * near me" is not going to be found by prose -- they are found by a machine
 * that knows this is a FurnitureStore, at these coordinates, open these
 * hours, on these numbers. That is what puts a shop in the map results, and
 * the map results are above everything else on a phone.
 *
 * FurnitureStore rather than the generic LocalBusiness, because the more
 * specific type is the one that qualifies for the richer treatment.
 */
export function ShopStructuredData() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FurnitureStore',
    '@id': `${SITE_URL}/#shop`,
    name: BRAND_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    image: absoluteUrl('/opengraph-image'),
    email: BRAND_EMAIL,

    /**
     * Both lines, in the international form.
     *
     * `telephone` takes one; the second goes in `contactPoint`, which is
     * where a machine looks for "is there another way to reach them".
     */
    telephone: BRAND_PHONES[0].replace(/\s/g, ''),
    contactPoint: BRAND_PHONES.map(phone => ({
      '@type': 'ContactPoint',
      telephone: phone.replace(/\s/g, ''),
      contactType: 'sales',
      areaServed: 'PK',
      availableLanguage: ['ur', 'en'],
    })),

    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Dhindhiyan Road, Chohar Shareef Chowk',
      addressLocality: 'Haripur',
      addressRegion: 'Khyber Pakhtunkhwa',
      addressCountry: 'PK',
    },

    /**
     * Open seven days, 11am to 8pm -- the same hours the contact page and
     * the enquiry emails promise. Three places saying different hours is
     * worse than none saying any.
     */
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday',
        ],
        opens: '11:00',
        closes: '20:00',
      },
    ],

    priceRange: 'Rs',
    currenciesAccepted: 'PKR',
    paymentAccepted: 'Cash, Bank transfer, Card',
    areaServed: { '@type': 'Country', name: 'Pakistan' },

    /**
     * No `aggregateRating` and no invented review count.
     *
     * Marking up ratings the shop has not received is exactly the thing that
     * gets a site's structured data ignored entirely, and it would be a lie
     * printed under its own name in a search result.
     */
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}

/**
 * The site itself, so a search for the shop's name can show a search box and
 * so the pages underneath are understood as belonging to one thing.
 */
export function SiteStructuredData() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: BRAND_NAME,
    url: SITE_URL,
    publisher: { '@id': `${SITE_URL}/#shop` },
    inLanguage: 'en-PK',
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}

export default ShopStructuredData
