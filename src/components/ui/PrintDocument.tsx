'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Printer } from 'lucide-react'
import Button from './Button'
import IconButton from './IconButton'

export interface PrintDocumentProps {
  /** The document itself. Rendered on screen and sent to the printer. */
  children: React.ReactNode
  /** Shown in the on-screen chrome only. */
  title: string
  /**
   * Extra buttons beside Print, on screen only.
   *
   * For things a document can be done with other than printing it -- sending
   * a booking bill on WhatsApp, say. They sit in the chrome, so they are
   * never part of what reaches the paper.
   */
  actions?: React.ReactNode
  onClose: () => void
}

/**
 * A document that previews on screen and prints as itself.
 *
 * The previous approach hid everything else on the page with a chain of
 * descendant selectors anchored to `[data-print="receipt-host"]` — things
 * like `> div:not(.fixed)`. That works only while the page structure is
 * exactly what the selectors assumed, and it stopped being true the moment
 * the till gained a shell. The printed page came out as the POS header and
 * nothing else: no receipt at all, on the one screen whose entire job is to
 * produce a piece of paper.
 *
 * This renders into a container appended directly to `<body>` instead. The
 * print rule then has one job — hide every top-level child of body except
 * this one — and it cannot be broken by anything a layout does further up
 * the tree, because there is nothing further up the tree.
 */
export default function PrintDocument({ children, title, actions, onClose }: PrintDocumentProps) {
  const [host, setHost] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const element = document.createElement('div')
    element.setAttribute('data-print-root', '')
    document.body.appendChild(element)
    setHost(element)

    // The escape hatch anyone reaches for first.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)

    // Nothing behind a full-screen preview should scroll.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      element.remove()
    }
  }, [onClose])

  if (!host) return null

  return createPortal(
    <div className="fixed inset-0 z-modal flex flex-col bg-scrim print:static print:block print:bg-surface">
      {/* Screen chrome. Never printed. */}
      <div className="flex items-center justify-between gap-4 border-b border-border-subtle bg-surface px-5 py-3 print:hidden">
        <h2 className="text-h3 text-text-primary">{title}</h2>
        <div className="flex items-center gap-2">
          {actions}
          <Button size="sm" onClick={() => window.print()} leftIcon={<Printer className="h-4 w-4" />}>
            Print
          </Button>
          <IconButton label="Close" size="sm" onClick={onClose}>
            <X />
          </IconButton>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-surface-subtle p-6 print:overflow-visible print:bg-surface print:p-0">
        {/* The sheet. Sized to A4 on screen so the preview matches the paper. */}
        <div className="mx-auto w-full max-w-[210mm] bg-surface p-8 shadow-e2 print:max-w-none print:p-0 print:shadow-none">
          {children}
        </div>
      </div>
    </div>,
    host
  )
}
