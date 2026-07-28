'use client'

import { useState } from 'react'
import Modal from './Modal'
import Button from './Button'

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  /** Name the record. "Delete this product?" tells the user nothing. */
  description: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

/**
 * Replaces the native `confirm()`.
 *
 * Five call sites used the browser dialog, including the one that records
 * revenue by marking an order paid. Native confirm is unstyled, unbrandable,
 * blocks the main thread, and on mobile reads as a browser warning rather
 * than part of the app.
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnOverlayClick={!busy}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            onClick={run}
            isLoading={busy}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-body text-text-secondary">{description}</p>
    </Modal>
  )
}

export default ConfirmDialog
