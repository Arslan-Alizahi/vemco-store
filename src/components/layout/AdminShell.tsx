'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, BarChart3, LayoutDashboard, Receipt } from 'lucide-react'
import { cn } from '@/lib/cn'
import Container from './Container'
import Logo from './Logo'
import AppFrame from './AppFrame'

const SECTIONS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
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

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  return (
    <AppFrame
      className="bg-surface-subtle text-ui"
      header={
        <header className="sticky top-0 z-sticky border-b border-border-subtle bg-surface">
          <Container size="wide">
            <div className="flex h-14 items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <Logo size="sm" href="/admin" />
                <span className="hidden rounded-xs bg-surface-subtle px-2 py-0.5 text-overline uppercase text-text-tertiary sm:inline">
                  Admin
                </span>
              </div>

              <nav aria-label="Admin sections" className="flex items-center gap-1">
                {SECTIONS.map(section => {
                  const active = isActive(section.href, section.exact)
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
                  className="ml-2 flex items-center gap-1.5 rounded-sm px-3 py-2 text-ui text-text-tertiary transition-colors duration-fast hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="hidden sm:inline">View store</span>
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
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
