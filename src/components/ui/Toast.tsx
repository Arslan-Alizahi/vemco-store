'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { X, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/cn'
import { spring } from '@/design/motion'
import IconButton from './IconButton'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
  action?: ToastAction
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (message: string, type?: ToastType, duration?: number, action?: ToastAction) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

/** Newest three only. Beyond that the stack covers the page it describes. */
const MAX_VISIBLE = 3

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider')
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  // Date.now() collided when two toasts fired inside the same millisecond,
  // which React resolved by reusing a key and dropping one.
  const seq = useRef(0)

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const addToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 5000, action?: ToastAction) => {
      seq.current += 1
      const toast: Toast = { id: `t${seq.current}`, message, type, duration, action }
      setToasts(prev => [...prev, toast].slice(-MAX_VISIBLE))
    },
    []
  )

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[]
  removeToast: (id: string) => void
}) {
  return (
    <>
      {/* Two regions: errors assert, everything else waits its turn. A single
          polite region would let a failure sit silent behind a success. */}
      <div
        aria-live="assertive"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-toast flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      >
        <AnimatePresence initial={false}>
          {toasts
            .filter(t => t.type === 'error')
            .map(toast => (
              <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
            ))}
        </AnimatePresence>
      </div>

      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-toast flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      >
        <AnimatePresence initial={false}>
          {toasts
            .filter(t => t.type !== 'error')
            .map(toast => (
              <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
            ))}
        </AnimatePresence>
      </div>
    </>
  )
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-success-600" />,
  error: <XCircle className="h-5 w-5 text-danger-600" />,
  warning: <AlertCircle className="h-5 w-5 text-warning-600" />,
  info: <Info className="h-5 w-5 text-text-tertiary" />,
}

const SURFACES: Record<ToastType, string> = {
  success: 'border-success-200 bg-success-50',
  error: 'border-danger-200 bg-danger-50',
  warning: 'border-warning-200 bg-warning-50',
  info: 'border-border-subtle bg-surface',
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [paused, setPaused] = useState(false)

  // Pausing on hover and focus is what makes a five-second toast usable: it
  // gives the user time to read it, and time to reach the Undo inside it.
  useEffect(() => {
    if (!toast.duration || paused) return
    const timer = setTimeout(onClose, toast.duration)
    return () => clearTimeout(timer)
  }, [toast.duration, paused, onClose])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.97 }}
      transition={spring.overlay}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-md border p-4 shadow-e2',
        SURFACES[toast.type]
      )}
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0">
        {ICONS[toast.type]}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-ui text-text-primary">{toast.message}</p>
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick()
              onClose()
            }}
            className="mt-2 rounded-sm text-ui font-medium text-caramel-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <IconButton label="Dismiss notification" size="sm" onClick={onClose} className="-mr-2 -mt-2">
        <X />
      </IconButton>
    </motion.div>
  )
}
