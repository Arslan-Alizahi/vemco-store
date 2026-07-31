'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, BarChart3, LayoutDashboard, LogOut, Receipt, Store, Users } from 'lucide-react'
import { cn } from '@/lib/cn'
import Container from './Container'
import Logo from './Logo'
import AppFrame from './AppFrame'

/**
 * The sections, in the order somebody actually works through them.
 *
 * Point of sale was missing entirely: /billing existed, was linked from
 * nowhere, and could only be reached by typing the URL. It is the screen a
 * shop uses most, so it sits second.
 */
const SECTIONS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/billing', label: 'Point of sale', icon: Store },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/revenue', label: 'Revenue', icon: BarChart3 },
  { href: '/admin/revenue/transactions', label: 'Transactions', icon: Receipt },
]

/**
 * Back-office chrome.
 *
 * Deliberately not the customer Navbar. Admin and the POS were both rendering
 * the storefront header, complete with a shopping-cart badge — an operator
 * managing stock had a customer basket sitting above their work.
 *
 * Denser than the storefront on purpose: this is a screen someone reads all
 * day, so it defaults to `ui` type and a slim bar.
 */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  /**
   * Exactly one section is current.
   *
   * A plain startsWith made both Revenue and Transactions active on
   * /admin/revenue/transactions, so the bar highlighted two tabs and told
   * assistive technology the page was two places at once. The longest
   * matching href wins, which is the one the visitor is actually on.
   */
  const current = SECTIONS.filter(section =>
    section.exact ? pathname === section.href : pathname.startsWith(section.href)
  ).sort((a, b) => b.href.length - a.href.length)[0]

  const isActive = (href: string) => current?.href === href

  const signOut = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' })
    // A full navigation, so middleware sees the cleared cookie.
    window.location.href = '/admin/login'
  }

  return (
    <AppFrame
      className="bg-surface-subtle text-ui"
      header={
        <header className="sticky top-0 z-sticky border-b border-border-subtle bg-surface">
          <Container size="wide">
            <div className="flex h-14 items-center justify-between gap-3 sm:gap-6">
              <div className="flex items-center gap-6">
                <Logo size="sm" href="/admin" />
                <span className="hidden rounded-xs bg-surface-subtle px-2 py-0.5 text-overline uppercase text-text-secondary sm:inline">
                  Admin
                </span>
              </div>

              <nav aria-label="Admin sections" className="no-scrollbar -mx-1 flex items-center gap-1 overflow-x-auto px-1">
                {SECTIONS.map(section => {
                  const active = isActive(section.href)
                  return (
                    /* The label is hidden under sm and the icon is
                       decorative, so on a phone every one of these links had
                       no accessible name -- the whole admin nav announced as
                       four unlabelled links. aria-label matches the visible
                       text exactly so voice control still works when it
                       does show. */
                    <Link
                      key={section.href}
                      href={section.href}
                      aria-label={section.label}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2 rounded-sm px-3 py-2 text-ui font-medium',
                        'transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active
                          ? 'bg-caramel-50 text-caramel-800'
                          : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
                      )}
                    >
                      <section.icon className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden sm:inline">{section.label}</span>
                    </Link>
                  )
                })}

                <Link
                  href="/"
                  aria-label="View store"
                  className="ml-2 flex items-center gap-1.5 rounded-sm px-3 py-2 text-ui text-text-secondary transition-colors duration-fast hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="hidden sm:inline">View store</span>
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>

                {/* Signing out clears the cookie on the server. The old one
                    deleted a localStorage flag, which left nothing to clear
                    because there was nothing holding the session. */}
                <button
                  type="button"
                  onClick={signOut}
                  aria-label="Sign out"
                  className="flex items-center gap-1.5 rounded-sm px-3 py-2 text-ui text-text-secondary transition-colors duration-fast hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </nav>
            </div>
          </Container>
        </header>
      }
    >
      {children}
    </AppFrame>
  )
}
