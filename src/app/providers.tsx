'use client'

import { MotionConfig } from 'framer-motion'
import { ToastProvider } from '@/components/ui/Toast'

/**
 * Client-side providers.
 *
 * MotionConfig must be mounted from a client component, not directly from the
 * server layout. With reducedMotion="user" it reads a media query to seed a
 * motion value; mounted across the RSC boundary that value is not initialised
 * before the motion children read it, so every element driven by `animate`
 * stays pinned at its `initial` state. On the homepage that left the hero at
 * opacity 0 -- rendered, 423px tall, and completely invisible.
 *
 * Elements using `whileInView` were unaffected, which is what made the bug
 * look like a styling problem rather than a provider problem.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>{children}</ToastProvider>
    </MotionConfig>
  )
}
