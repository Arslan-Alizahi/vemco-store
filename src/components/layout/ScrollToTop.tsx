'use client'

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import IconButton from '@/components/ui/IconButton'

/**
 * Back-to-top control.
 *
 * Previously a child of `<footer>`, so it only existed on the twelve pages
 * that rendered a Footer -- and none of the long-scrolling ones that actually
 * need it. It also sat permanently in the bottom-right corner, fighting the
 * toast stack for the same space.
 *
 * Now it lives in the shell, appears only after a real scroll, and sits above
 * the toast corner rather than on top of it.
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <IconButton
      label="Back to top"
      variant="solid"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-24 right-4 z-sticky shadow-e2"
    >
      <ArrowUp />
    </IconButton>
  )
}

export default ScrollToTop
