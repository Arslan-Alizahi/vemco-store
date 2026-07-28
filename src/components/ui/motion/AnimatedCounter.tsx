'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'

export interface AnimatedCounterProps {
  value: number
  /** Wraps the final number, e.g. n => formatCurrency(n). */
  format?: (value: number) => string
  durationMs?: number
  className?: string
}

/**
 * Counts up to a value when it scrolls into view.
 *
 * Renders the final value immediately under reduced motion, and always
 * exposes the true figure to assistive tech through aria-label so a screen
 * reader announces the number once rather than narrating every frame.
 */
export function AnimatedCounter({
  value,
  format = n => n.toLocaleString('en-PK'),
  durationMs = 900,
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -40px 0px' })
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    if (reduced) {
      setDisplay(value)
      return
    }

    let raf = 0
    let start: number | null = null

    const step = (now: number) => {
      if (start === null) start = now
      const progress = Math.min((now - start) / durationMs, 1)
      // Ease-out cubic: fast at first, settling gently, which reads as
      // counting rather than sliding.
      setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [inView, reduced, value, durationMs])

  return (
    <span ref={ref} className={cn('tabular-nums', className)} aria-label={format(value)}>
      <span aria-hidden="true">{format(display)}</span>
    </span>
  )
}
