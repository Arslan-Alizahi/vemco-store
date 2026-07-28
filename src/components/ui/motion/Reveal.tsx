'use client'

import { motion, type Variants } from 'framer-motion'
import { cn } from '@/lib/cn'
import { duration, ease, staggerDelay } from '@/design/motion'

type Direction = 'up' | 'down' | 'left' | 'right' | 'none'

const OFFSET: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 16 },
  down: { x: 0, y: -16 },
  left: { x: 16, y: 0 },
  right: { x: -16, y: 0 },
  none: { x: 0, y: 0 },
}

export interface RevealProps {
  children: React.ReactNode
  /** Position in a group; drives the stagger, capped at six items. */
  index?: number
  direction?: Direction
  className?: string
  as?: 'div' | 'section' | 'li' | 'article'
}

/**
 * Fades content in as it scrolls into view.
 *
 * Uses `whileInView` with `once`, not `animate`. The pages this replaces used
 * `animate` with delays up to 800ms, so their sections finished animating
 * off-screen where nobody could see them -- pure latency. `once` also means a
 * section never re-animates when the user scrolls back up.
 *
 * MotionConfig in the root provider handles reduced motion: transforms are
 * dropped and only the opacity fade remains.
 */
export function Reveal({
  children,
  index = 0,
  direction = 'up',
  className,
  as = 'div',
}: RevealProps) {
  const offset = OFFSET[direction]

  const variants: Variants = {
    hidden: { opacity: 0, ...offset },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: duration.slow / 1000,
        ease: ease.standard,
        delay: staggerDelay(index),
      },
    },
  }

  const MotionTag = motion[as]

  return (
    <MotionTag
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      variants={variants}
    >
      {children}
    </MotionTag>
  )
}

export default Reveal
