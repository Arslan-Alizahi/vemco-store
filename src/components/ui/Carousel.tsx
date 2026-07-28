'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'

export interface CarouselProps {
  /** One node per slide. */
  children: React.ReactNode[]
  /** Required. Names the region for screen readers. */
  label: string
  /** Slides visible at once, per breakpoint. */
  perView?: { base: number; sm?: number; lg?: number }
  /** Milliseconds between advances. Omit for a manual carousel. */
  autoplayMs?: number
  loop?: boolean
  showArrows?: boolean
  showDots?: boolean
  className?: string
}

/**
 * Scroll-snap carousel.
 *
 * Transport is native CSS scroll-snap rather than a transform track, so touch
 * and trackpad gestures behave exactly as the platform intends and the
 * content is still scrollable if JavaScript never loads.
 *
 * Accessibility contract, all of it mandatory:
 *  - region + aria-roledescription="carousel" with an accessible name
 *  - each slide labelled "n of total"
 *  - a visible pause control whenever autoplay is running (WCAG 2.2.2 requires
 *    a pause mechanism for motion lasting over five seconds)
 *  - autoplay never starts under prefers-reduced-motion, and stops for good on
 *    any interaction rather than fighting the user
 *  - off-screen slides are inert, so Tab does not wander into content nobody
 *    can see
 *  - dots are real buttons with aria-current, not decorative divs
 */
export function Carousel({
  children,
  label,
  perView = { base: 1, sm: 2, lg: 4 },
  autoplayMs,
  loop = true,
  showArrows = true,
  showDots = true,
  className,
}: CarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])
  const reduced = useReducedMotion()

  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(Boolean(autoplayMs))
  // Once the user takes control, autoplay does not come back.
  const [userTook, setUserTook] = useState(false)

  const count = children.length
  const canAutoplay = Boolean(autoplayMs) && !reduced && !userTook

  const scrollTo = useCallback((index: number) => {
    const track = trackRef.current
    const slide = slideRefs.current[index]
    if (!track || !slide) return
    track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: 'smooth' })
  }, [])

  const go = useCallback(
    (index: number, fromUser = true) => {
      if (fromUser) setUserTook(true)
      const next = loop ? (index + count) % count : Math.min(Math.max(index, 0), count - 1)
      scrollTo(next)
    },
    [count, loop, scrollTo]
  )

  // Track which slide is centred, so the dots and inert state follow real
  // scroll position rather than an index we merely hope is accurate.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!visible) return
        const index = slideRefs.current.indexOf(visible.target as HTMLDivElement)
        if (index >= 0) setActive(index)
      },
      { root: track, threshold: 0.6 }
    )

    slideRefs.current.forEach(slide => slide && observer.observe(slide))
    return () => observer.disconnect()
  }, [count])

  // Off-screen slides must not be reachable by Tab. `inert` is set on the DOM
  // directly: React 18 does not render a boolean `inert` prop, and only
  // single-slide carousels hide anything -- in a multi-column one every slide
  // in view is real content.
  useEffect(() => {
    if (perView.base !== 1) return
    slideRefs.current.forEach((slide, index) => {
      if (!slide) return
      if (index === active) slide.removeAttribute('inert')
      else slide.setAttribute('inert', '')
    })
  }, [active, count, perView.base])

  useEffect(() => {
    if (!canAutoplay || !playing) return
    const id = setInterval(() => {
      setActive(current => {
        const next = (current + 1) % count
        scrollTo(next)
        return next
      })
    }, autoplayMs)
    return () => clearInterval(id)
  }, [canAutoplay, playing, autoplayMs, count, scrollTo])

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      go(active - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      go(active + 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      go(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      go(count - 1)
    }
  }

  const basis = cn(
    perView.base === 1 ? 'basis-full' : perView.base === 2 ? 'basis-1/2' : 'basis-1/3',
    perView.sm === 2 && 'sm:basis-1/2',
    perView.sm === 3 && 'sm:basis-1/3',
    perView.lg === 3 && 'lg:basis-1/3',
    perView.lg === 4 && 'lg:basis-1/4'
  )

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      className={cn('relative', className)}
      onMouseEnter={() => canAutoplay && setPlaying(false)}
      onMouseLeave={() => canAutoplay && setPlaying(true)}
      onFocusCapture={() => canAutoplay && setPlaying(false)}
    >
      <div
        ref={trackRef}
        tabIndex={0}
        role="group"
        aria-label={`${label}, ${count} items`}
        onKeyDown={onKeyDown}
        className={cn(
          'no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth',
          'rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-canvas'
        )}
      >
        {children.map((slide, index) => (
          <div
            key={index}
            ref={node => {
              slideRefs.current[index] = node
            }}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${count}`}
            className={cn('min-w-0 shrink-0 grow-0 snap-start', basis)}
          >
            {slide}
          </div>
        ))}
      </div>

      {(showArrows || showDots || canAutoplay) && (
        <div className="mt-5 flex items-center justify-between gap-4">
          {showDots ? (
            <div className="flex items-center gap-2">
              {children.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => go(index)}
                  aria-label={`Go to item ${index + 1}`}
                  aria-current={index === active ? 'true' : undefined}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-base ease-standard',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
                    index === active
                      ? 'w-6 bg-caramel-600'
                      : 'w-1.5 bg-border-strong hover:bg-text-tertiary'
                  )}
                />
              ))}
            </div>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            {/* WCAG 2.2.2 -- any autoplay over five seconds needs a pause. */}
            {canAutoplay && (
              <button
                type="button"
                onClick={() => setPlaying(p => !p)}
                aria-label={playing ? 'Pause carousel' : 'Play carousel'}
                className="flex h-11 w-11 items-center justify-center rounded-sm text-text-secondary transition-colors duration-fast hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
            )}

            {showArrows && (
              <>
                <button
                  type="button"
                  onClick={() => go(active - 1)}
                  disabled={!loop && active === 0}
                  aria-label="Previous"
                  className="flex h-11 w-11 items-center justify-center rounded-sm border border-border-subtle text-text-secondary transition-colors duration-fast hover:bg-surface-subtle hover:text-text-primary disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => go(active + 1)}
                  disabled={!loop && active === count - 1}
                  aria-label="Next"
                  className="flex h-11 w-11 items-center justify-center rounded-sm border border-border-subtle text-text-secondary transition-colors duration-fast hover:bg-surface-subtle hover:text-text-primary disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
