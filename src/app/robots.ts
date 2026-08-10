import type { MetadataRoute } from 'next'
import { adminPath } from '@/lib/admin-path'
import { absoluteUrl } from '@/lib/site'

/**
 * What crawlers may read.
 *
 * The shop wants indexing -- being found is the point of having a website at
 * all -- so this opens everything except the parts that are either private
 * or meaningless in a search result.
 *
 * Worth being clear that this file is a request, not a fence. Anything that
 * genuinely must not be reached is behind the session check in middleware;
 * a well-behaved crawler honours this, and the other kind was never going to.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        // The staff screens, under whatever path they answer on. Listing
        // them here is a trade: it keeps them out of search results, at the
        // cost of naming the path in a public file. Worth it, because a
        // panel that turns up in a Google search for the shop's name is
        // found by everybody, whereas robots.txt is read by almost nobody.
        `/${adminPath()}/`,
        // Somebody's own enquiry, keyed on their reference. Nothing on it is
        // sensitive, but it is one person's page and has no business being a
        // search result.
        '/enquiry/',
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  }
}
