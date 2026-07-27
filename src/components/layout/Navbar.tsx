'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { ShoppingCart, Menu, X, Package, Heart } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { useFavorites } from '@/hooks/useFavorites'
import { cn } from '@/lib/cn'
import { motion, AnimatePresence } from 'framer-motion'
import { NavItem } from '@/types/nav'
import * as LucideIcons from 'lucide-react'

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [navLinks, setNavLinks] = useState<NavItem[]>([])
  const pathname = usePathname()
  const { itemCount } = useCart()
  const { count: favoritesCount } = useFavorites()

  useEffect(() => {
    // Fetch navigation items from API
    fetch('/api/nav?location=header&active_only=true')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          // Filter to only show top-level items (no parent_id)
          const topLevelItems = (data.data || []).filter((item: NavItem) => !item.parent_id)
          setNavLinks(topLevelItems)
        }
      })
      .catch((error) => console.error('Error fetching nav items:', error))
  }, [])

  // Get icon component from lucide-react
  const getIcon = (iconName?: string) => {
    if (!iconName) return null
    const Icon = (LucideIcons as any)[iconName]
    return Icon ? Icon : null
  }

  return (
    <nav className="glass sticky top-0 z-sticky border-b border-border-subtle">
      <div className="mx-auto max-w-content px-5 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              <Package className="h-6 w-6 text-caramel-700" aria-hidden="true" />
              <span className="font-serif text-h3 tracking-[-0.015em] text-text-primary">
                ModernStore
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-7 md:flex">
            {navLinks.map((link) => {
              const Icon = getIcon(link.icon)
              const isActive =
                pathname === link.href ||
                (link.href !== '/' && pathname.startsWith(link.href))
              return (
                <Link
                  key={link.id}
                  href={link.href}
                  target={link.target || '_self'}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'relative flex items-center gap-1.5 rounded-sm py-1 text-ui font-medium',
                    'transition-colors duration-fast ease-standard',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
                    isActive
                      ? 'text-text-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
                  {link.label}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-caramel-600"
                    />
                  )}
                </Link>
              )
            })}
          </div>

          {/* Favorites, Cart & Mobile Menu */}
          <div className="flex items-center space-x-4">
            <Link
              href="/favorites"
              aria-label={`Favourites${favoritesCount > 0 ? `, ${favoritesCount} saved` : ''}`}
              className="relative flex h-11 w-11 items-center justify-center rounded-sm text-text-secondary transition-colors duration-fast hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Heart className="h-5 w-5" aria-hidden="true" />
              {favoritesCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-caramel-600 px-1 text-[10px] font-medium tabular-nums text-white">
                  {favoritesCount > 99 ? '99+' : favoritesCount}
                </span>
              )}
            </Link>

            <Link
              href="/cart"
              aria-label={`Cart${itemCount > 0 ? `, ${itemCount} items` : ', empty'}`}
              className="relative flex h-11 w-11 items-center justify-center rounded-sm text-text-secondary transition-colors duration-fast hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              {itemCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-caramel-600 px-1 text-[10px] font-medium tabular-nums text-white">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              className="flex h-11 w-11 items-center justify-center rounded-sm text-text-secondary transition-colors duration-fast hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            id="mobile-menu"
            className="overflow-hidden border-t border-border-subtle bg-surface md:hidden"
          >
            <div className="space-y-1 px-4 py-2">
              {navLinks.map((link) => {
                const Icon = getIcon(link.icon)
                return (
                  <Link
                    key={link.id}
                    href={link.href}
                    target={link.target || '_self'}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                  >
                    {Icon && <Icon className="h-5 w-5" />}
                    <span>{link.label}</span>
                  </Link>
                )
              })}

              {/* Favorites & Cart Links */}
              <div className="border-t pt-2 mt-2">
                <Link
                  href="/favorites"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Heart className="h-5 w-5" />
                    <span>Favorites</span>
                  </div>
                  {favoritesCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {favoritesCount}
                    </span>
                  )}
                </Link>

                <Link
                  href="/cart"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <ShoppingCart className="h-5 w-5" />
                    <span>Shopping Cart</span>
                  </div>
                  {itemCount > 0 && (
                    <span className="bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {itemCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}