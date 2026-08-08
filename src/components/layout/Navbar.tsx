'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ShoppingCart, Menu, X, Heart, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import * as LucideIcons from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { useFavorites } from '@/hooks/useFavorites'
import { cn } from '@/lib/cn'
import { NavItem } from '@/types/nav'
import Container from './Container'
import Logo from './Logo'

export interface NavbarProps {
  /**
   * Fetched on the server by the shell.
   *
   * This used to be a client useEffect, so the header painted empty and then
   * materialised ~450px of links on every single navigation.
   */
  links: NavItem[]
}

export default function Navbar({ links }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const { itemCount } = useCart()

  /**
   * Rings the cart badge for a moment when the count goes up.
   *
   * Adding to the cart happens on the product page, and the confirmation is a
   * toast in the opposite corner from the thing that actually changed. This
   * points at the change itself.
   *
   * Only on an increase, and only after the first render: it should mark
   * something the person just did, not fire on every page load because a
   * saved cart came back out of localStorage.
   */
  const [cartJustChanged, setCartJustChanged] = useState(false)
  const previousCount = useRef<number | null>(null)

  useEffect(() => {
    const previous = previousCount.current
    previousCount.current = itemCount

    if (previous === null || itemCount <= previous) return

    setCartJustChanged(true)
    // Slightly longer than the two iterations, so the class is removed after
    // the animation rather than cutting it short.
    const timer = setTimeout(() => setCartJustChanged(false), 2600)
    return () => clearTimeout(timer)
  }, [itemCount])
  const { count: favoritesCount } = useFavorites()
  const menuRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close on navigation, or the menu stays open over the new page.
  useEffect(() => setIsMenuOpen(false), [pathname])

  // Escape closes and returns focus to the toggle; body scroll is locked while
  // the panel covers the page.
  useEffect(() => {
    if (!isMenuOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setIsMenuOpen(false)
      toggleRef.current?.focus()
    }

    document.addEventListener('keydown', onKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
    }
  }, [isMenuOpen])

  const getIcon = (iconName?: string) => {
    if (!iconName) return null
    const Icon = (LucideIcons as any)[iconName]
    return Icon ?? null
  }

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href))

  const countPill =
    'absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-caramel-600 px-1 text-[10px] font-medium tabular-nums text-white'

  const iconLink =
    'relative flex h-11 w-11 items-center justify-center rounded-sm text-text-secondary transition-colors duration-fast hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <header
      className={cn(
        'sticky top-0 z-sticky border-b transition-shadow duration-base ease-standard',
        // Hairline at rest, a whisper of elevation once the page moves under
        // it. The old header carried a permanent shadow-lg, which was the
        // loudest depth cue on the page doing a hairline's job.
        scrolled ? 'glass border-border-subtle shadow-e1' : 'border-transparent bg-canvas'
      )}
    >
      <Container>
        <nav aria-label="Main" className="flex h-16 items-center justify-between gap-4">
          <Logo />

          <div className="hidden items-center gap-7 md:flex">
            {links.map(link => {
              const Icon = getIcon(link.icon)
              const active = isActive(link.href)
              return (
                <Link
                  key={link.id}
                  href={link.href}
                  target={link.target || '_self'}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex items-center gap-1.5 rounded-sm py-1 text-ui font-medium',
                    'transition-colors duration-fast ease-standard',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
                    active ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
                  {link.label}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-caramel-600"
                    />
                  )}
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-1">
            <Link href="/products" aria-label="Search products" className={cn(iconLink, 'hidden sm:flex')}>
              <Search className="h-5 w-5" aria-hidden="true" />
            </Link>

            <Link
              href="/favorites"
              aria-label={`Favourites${favoritesCount > 0 ? `, ${favoritesCount} saved` : ''}`}
              className={iconLink}
            >
              <Heart className="h-5 w-5" aria-hidden="true" />
              {favoritesCount > 0 && (
                <span className={countPill}>{favoritesCount > 99 ? '99+' : favoritesCount}</span>
              )}
            </Link>

            <Link
              href="/cart"
              // "Cart, 1 items" is what a screen reader read out with one
              // thing in the basket.
              aria-label={
                itemCount > 0 ? `Cart, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}` : 'Cart, empty'
              }
              className={iconLink}
            >
              <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              {itemCount > 0 && (
                <span className={cn(countPill, cartJustChanged && 'animate-ring-pulse')}>
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>

            <button
              ref={toggleRef}
              type="button"
              onClick={() => setIsMenuOpen(open => !open)}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              className={cn(iconLink, 'md:hidden')}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
      </Container>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            ref={menuRef}
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden border-t border-border-subtle bg-surface md:hidden"
          >
            <Container className="py-3">
              <ul className="space-y-1">
                {links.map(link => {
                  const Icon = getIcon(link.icon)
                  const active = isActive(link.href)
                  return (
                    <li key={link.id}>
                      <Link
                        href={link.href}
                        target={link.target || '_self'}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex items-center gap-3 rounded-sm px-3 py-3 text-body font-medium',
                          'transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          active
                            ? 'bg-caramel-50 text-text-primary'
                            : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
                        )}
                      >
                        {Icon && <Icon className="h-5 w-5" aria-hidden="true" />}
                        {link.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
