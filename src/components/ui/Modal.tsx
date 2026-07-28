'use client'

import { ReactNode, useCallback, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/cn'
import { spring } from '@/design/motion'
import IconButton from './IconButton'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-[min(64rem,calc(100vw-2rem))]',
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const returnFocusTo = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descId = useId()

  const focusables = useCallback(
    () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []),
    []
  )

  // Move focus in on open, and put it back where it came from on close.
  // `panelRef` existed before but was only attached, never used -- so opening
  // a dialog left focus behind it on the page.
  useEffect(() => {
    if (!isOpen) return

    returnFocusTo.current = document.activeElement as HTMLElement | null
    const id = requestAnimationFrame(() => {
      const [first] = focusables()
      ;(first ?? panelRef.current)?.focus()
    })

    return () => {
      cancelAnimationFrame(id)
      returnFocusTo.current?.focus?.()
    }
  }, [isOpen, focusables])

  // Escape to close, Tab wrapped inside the panel. Without the trap, tabbing
  // out of the POS payment dialog stranded keyboard users behind the overlay.
  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const items = focusables()
      if (items.length === 0) {
        event.preventDefault()
        return
      }

      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement

      if (event.shiftKey && (active === first || !panelRef.current?.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen, onClose, focusables])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-modal">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-scrim backdrop-blur-[2px]"
            aria-hidden="true"
          />

          {/* The click handler lives on the scroll container, not the overlay
              beneath it. Previously the container painted over the overlay and
              swallowed every click, so closeOnOverlayClick did nothing. */}
          <div
            className="absolute inset-0 overflow-y-auto p-4 sm:p-6"
            onMouseDown={event => {
              if (closeOnOverlayClick && event.target === event.currentTarget) onClose()
            }}
          >
            <div className="flex min-h-full items-center justify-center">
              <motion.div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? titleId : undefined}
                aria-describedby={description ? descId : undefined}
                tabIndex={-1}
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={spring.overlay}
                className={cn(
                  // focus:, not focus-visible:. This panel is a container that
                  // receives focus programmatically on open, and focus-visible
                  // heuristics vary for that -- some browsers would draw a
                  // default outline around the whole dialog.
                  'relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-lg bg-surface text-left shadow-e3 focus:outline-none',
                  sizeClasses[size]
                )}
              >
                {(title || showCloseButton) && (
                  <div className="flex items-start justify-between gap-4 border-b border-border-subtle px-6 py-4">
                    <div className="min-w-0">
                      {title && (
                        <h2 id={titleId} className="text-h3 text-text-primary">
                          {title}
                        </h2>
                      )}
                      {description && (
                        <p id={descId} className="mt-1 text-ui text-text-secondary">
                          {description}
                        </p>
                      )}
                    </div>
                    {showCloseButton && (
                      <IconButton label="Close" size="sm" onClick={onClose} className="-mr-2 -mt-2">
                        <X />
                      </IconButton>
                    )}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

                {footer && (
                  <div className="border-t border-border-subtle bg-surface-subtle px-6 py-4">
                    {footer}
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export { Modal }
