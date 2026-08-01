import { runQuery } from '@/lib/db'
import { isShowcase, staticNav } from '@/lib/catalogue'
import type { NavItem } from '@/types/nav'

/**
 * Reads navigation straight from the database, on the server.
 *
 * The Navbar used to fetch this itself in a useEffect, so the header rendered
 * empty and then filled in on every navigation. Reading it here means the
 * links are in the first HTML response.
 */
export const getNavItems = (location: 'header' | 'footer'): NavItem[] => {
  // A storefront-only build has no database to read this out of.
  if (isShowcase()) return staticNav(location)

  try {
    return runQuery<NavItem>(
      `SELECT * FROM nav_items
       WHERE location = ? AND is_active = 1 AND parent_id IS NULL
       ORDER BY display_order ASC`,
      [location]
    )
  } catch (error) {
    console.error(`Failed to load ${location} navigation:`, error)
    return []
  }
}

/**
 * Shown when the nav table is empty or unreadable.
 *
 * A fresh install with no seed data would otherwise render a header with no
 * links at all -- and for a store that ships as a template, the zero-data
 * state is the first impression.
 */
export const FALLBACK_HEADER_NAV: NavItem[] = [
  { id: -1, label: 'Home', href: '/', display_order: 0, is_active: true, location: 'header' },
  { id: -2, label: 'Shop', href: '/products', display_order: 1, is_active: true, location: 'header' },
  { id: -3, label: 'Categories', href: '/categories', display_order: 2, is_active: true, location: 'header' },
  { id: -4, label: 'About', href: '/about', display_order: 3, is_active: true, location: 'header' },
  { id: -5, label: 'Contact', href: '/contact', display_order: 4, is_active: true, location: 'header' },
]

export const getHeaderNav = (): NavItem[] => {
  const items = getNavItems('header')
  return items.length > 0 ? items : FALLBACK_HEADER_NAV
}
