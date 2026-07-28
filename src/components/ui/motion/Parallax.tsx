'use client'

import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/cn'

export interface ParallaxProps {
  children: React.ReactNode
  /** Travel in pixels across the whole scroll range. Keep it under ~60. */
  distance?: number
  className?: string
}

/**
 * Scroll-linked vertical drift, for hero layers only.
 *
 * Deliberately not used on long reading pages: scroll-linked transform there
 * fights the reader and conflicts with the reduced-motion mandate. Returns a
 * plain wrapper when the user prefers reduced motion, so nothing moves and
 * the scroll listener is never attached.
 */
export function Parallax({ children, distance = 40, className }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const y = useSpring(useTransform(scrollYProgress, [0, 1], [distance, -distance]), {
    stiffness: 120,
    damping: 30,
    mass: 0.4,
  })

  if (reduced) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    )
  }

  return (
    <motion.div ref={ref} style={{ y }} className={cn('will-change-transform', className)}>
      {children}
    </motion.div>
  )
}
