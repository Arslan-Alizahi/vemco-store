import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand'

/**
 * Where this shop lives on the internet, and how it introduces itself.
 *
 * Everything that has to produce an absolute URL reads from here: the share
 * card, the sitemap, the canonical link, the structured data. Getting this
 * wrong does not break the site in any way a visitor would notice -- it
 * breaks it in the places nobody looks at until a link has been shared a
 * thousand times with a blank preview.
 */

/**
 * Trailing slash removed, because everything appends its own path.
 *
 * `${SITE_URL}/products` with a trailing slash gives `//products`, which
 * most things tolerate and a few -- notably Open Graph scrapers -- do not.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
).replace(/\/+$/, '')

/** An absolute URL for a path. Share cards and sitemaps need whole URLs. */
export const absoluteUrl = (path = '/'): string =>
  `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`

/**
 * The sentence that appears under the link when somebody shares it.
 *
 * Written for the person deciding whether to tap, not for a search engine:
 * what the shop sells, where it is, and the one thing that separates it from
 * the next result. Keyword stuffing reads as spam to a reader and has not
 * helped a ranking in a decade.
 */
export const SITE_DESCRIPTION =
  `Solid wood furniture from ${BRAND_NAME} in Haripur — sofas, beds, dining and storage, ` +
  'with full dimensions on every piece and delivery across Pakistan.'

export const SITE_NAME = BRAND_NAME
export const SITE_TAGLINE = BRAND_TAGLINE
