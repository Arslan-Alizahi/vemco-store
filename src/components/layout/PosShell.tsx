'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Container from './Container'
import Logo from './Logo'
import AppFrame from './AppFrame'
import { adminUrl } from '@/lib/admin-path'

/**
 * Point-of-sale chrome.
 *
 * Nothing here navigates away mid-transaction except one clearly labelled
 * exit — a cashier with a part-built sale should not be able to lose it by
 * clicking a nav link out of habit. That is also why the customer Navbar,
 * which this screen used to render complete with a shopping-cart badge, is
 * gone.
 *
 * Text runs at `body` rather than the denser admin `ui` size: a register is
 * read at arm's length, often across a counter, frequently by someone not
 * looking straight at it.
 */
export default function PosShell({ children }: { children: React.ReactNode }) {
  return (
    <AppFrame
      className="bg-surface-subtle"
      header={
        <header className="sticky top-0 z-sticky border-b border-border-subtle bg-surface">
          <Container size="wide">
            <div className="flex h-14 items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Logo size="sm" href={null} />
                <span className="rounded-xs bg-caramel-50 px-2 py-0.5 text-overline uppercase text-caramel-800">
                  Point of sale
                </span>
              </div>

              {/* The label is hidden under sm and the arrow is decorative, so
                  on a phone this link had no accessible name whatsoever --
                  and it is the only way out of the register. aria-label
                  matches the visible text exactly, so a voice-control user
                  saying what they can see still hits it. */}
              <Link
                href={adminUrl()}
                aria-label="Exit to admin"
                className="flex items-center gap-1.5 rounded-sm px-3 py-2 text-ui text-text-tertiary transition-colors duration-fast hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Exit to admin</span>
              </Link>
            </div>
          </Container>
        </header>
      }
    >
      {children}
    </AppFrame>
  )
}
