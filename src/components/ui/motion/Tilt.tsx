'use client'

import { useRef } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/cn'

export interface TiltProps {
  children: React.ReactNode
  /** Maximum rotation in degrees. Keep it small; past ~6 the type blurs. */
  max?: number
  className?: string
}

/**
 * Pointer-tracked 3D tilt.
 *
 * Applies to a media frame, never to a card that contains text. The previous
 * `.card-3d-hover` rotated whole product cards 5 degrees, which destroyed
 * subpixel antialiasing on the type inside and clipped the image into the grid
 * gutter. Rotating an image inside its own clipped frame has neither problem.
 *
 * Disabled outright under reduced motion and on touch, where there is no
 * hover state to drive it.
 */
export function Tilt({ children, max = 6, className }: TiltProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)

  const spring = { stiffness: 260, damping: 26, mass: 0.6 }
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring)
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring)

  if (reduced) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      ref={ref}
      className={cn('[transform-style:preserve-3d]', className)}
      style={{ perspective: 900, rotateX, rotateY }}
      onPointerMove={event => {
        if (event.pointerType !== 'mouse') return
        const rect = ref.current?.getBoundingClientRect()
        if (!rect) return
        px.set((event.clientX - rect.left) / rect.width)
        py.set((event.clientY - rect.top) / rect.height)
      }}
      onPointerLeave={() => {
        px.set(0.5)
        py.set(0.5)
      }}
    >
      {children}
    </motion.div>
  )
}
