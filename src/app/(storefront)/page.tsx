'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight, Hammer, Quote, Ruler, Trees, Truck } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import { ProductCardSkeleton } from '@/components/ui/Skeleton'
import { Carousel } from '@/components/ui/Carousel'
import { Parallax } from '@/components/ui/motion/Parallax'
import { Reveal } from '@/components/ui/motion/Reveal'
import { Tilt } from '@/components/ui/motion/Tilt'
import { AnimatedCounter } from '@/components/ui/motion/AnimatedCounter'
import ProductCard from '@/components/storefront/ProductCard'
import { ease, duration } from '@/design/motion'
import { Product } from '@/types/product'

const FEATURES = [
  {
    icon: Trees,
    title: 'Solid wood',
    description: 'No veneer over particleboard. What you see on the edge is what it is made of.',
  },
  {
    icon: Hammer,
    title: 'Real joinery',
    description: 'Mortise and tenon where it matters, so the frame stays square for decades.',
  },
  {
    icon: Ruler,
    title: 'Honest dimensions',
    description: 'Every listing carries full measurements and a doorway clearance note.',
  },
  {
    icon: Truck,
    title: 'Room of choice',
    description: 'Delivered, carried in, unwrapped, and the packaging taken away with us.',
  },
]

const NUMBERS = [
  { value: 5, suffix: ' yr', label: 'Structural guarantee' },
  { value: 20, suffix: '+', label: 'Pieces in the collection' },
  { value: 45000, suffix: '', label: 'Martindale rub count', format: true },
  { value: 3, suffix: '-5 days', label: 'Delivered across Pakistan' },
]

const ROOMS = [
  { slug: 'sofas-seating', name: 'Sofas & Seating', image: '/seed/products/emerald-velvet-sofa-sm.webp', id: 1 },
  { slug: 'beds-bedroom', name: 'Beds & Bedroom', image: '/seed/products/curved-upholstered-bed-sm.webp', id: 2 },
  { slug: 'dining', name: 'Dining', image: '/seed/products/grand-dining-table-sm.webp', id: 3 },
  { slug: 'tables', name: 'Tables', image: '/seed/products/round-walnut-coffee-table-sm.webp', id: 4 },
  { slug: 'storage', name: 'Storage', image: '/seed/products/sliding-door-wardrobe-sm.webp', id: 5 },
]

const VOICES = [
  {
    quote:
      'The sofa arrived on the day they said, carried up two flights, unwrapped, and the packaging went back down with them. Nobody does that.',
    name: 'Sana R.',
    place: 'DHA Phase 5, Lahore',
  },
  {
    quote:
      'I measured the doorway three times because the listing told me to. It cleared by four centimetres. Everything else I have ordered online got stuck.',
    name: 'Bilal A.',
    place: 'F-7, Islamabad',
  },
  {
    quote:
      'Four years in, the frame has not shifted and the velvet has not gone shiny where we sit. It cost more than the shop down the road and it has already outlasted two of theirs.',
    name: 'Hina M.',
    place: 'Clifton, Karachi',
  },
]

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  // A failed request and an empty shelf are not the same thing. This used to
  // swallow the error and fall through to "Nothing featured just now", which
  // tells the visitor the shop has nothing to show when in fact the page
  // could not ask -- and offers no way to try again.
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  const loadFeatured = useCallback(() => {
    setStatus('loading')
    fetch('/api/products?is_featured=true&limit=6')
      .then(res => {
        if (!res.ok) throw new Error('Request failed')
        return res.json()
      })
      .then(data => {
        if (!data.success) throw new Error(data.message || 'Request failed')
        setFeaturedProducts(data.data.products || [])
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  useEffect(loadFeatured, [loadFeatured])

  return (
    <div className="bg-canvas">
      {/* ---------------------------------------------------------------- */}
      {/* Hero. Built in layers rather than as a flat panel: a photograph   */}
      {/* that drifts on scroll, a warm wash over it, and the type on glass */}
      {/* in front. The alpha on that glass is what keeps the white text at */}
      {/* contrast -- the blur is decoration and carries no guarantee.      */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative isolate overflow-hidden bg-bark-950">
        <Parallax distance={60} className="absolute inset-0 -z-10 scale-110">
          <Image
            src="/seed/products/classic-sofa-set-lg.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-40"
          />
        </Parallax>

        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grain-warm" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-bark-950/55" />

        <div className="relative mx-auto max-w-content px-5 py-section-lg sm:px-6 lg:px-8">
          <div className="mx-auto max-w-prose">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: duration.slow / 1000, ease: ease.standard }}
              className="glass-dark rounded-xl p-8 text-center shadow-float sm:p-12"
            >
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.12, duration: duration.slow / 1000, ease: ease.standard }}
                className="mb-5 text-overline uppercase text-caramel-300"
              >
                Made to be lived with
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: duration.slow / 1000, ease: ease.standard }}
                className="mb-6 font-serif text-[2.5rem] leading-[1.05] tracking-[-0.03em] text-white md:text-display"
              >
                Furniture for considered spaces
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.26, duration: duration.slow / 1000, ease: ease.standard }}
                className="mx-auto mb-10 max-w-[46ch] text-body-lg text-bark-100"
              >
                Solid wood, honest joinery, and pieces that earn their place. Built to
                outlast the room you bought them for.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.34, duration: duration.slow / 1000, ease: ease.standard }}
                className="flex flex-col justify-center gap-3 sm:flex-row"
              >
                <Button asChild size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  <Link href="/products">Shop the collection</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  <Link href="/about">Our story</Link>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Numbers. Counting up earns attention on a figure worth reading;   */}
      {/* AnimatedCounter announces the final value to assistive tech once  */}
      {/* rather than narrating every frame.                                */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-b border-border-subtle bg-surface">
        <div className="mx-auto grid max-w-content grid-cols-2 gap-px overflow-hidden px-5 sm:px-6 lg:grid-cols-4 lg:px-8">
          {NUMBERS.map((item, index) => (
            <Reveal key={item.label} index={index} className="py-10 text-center">
              <p className="font-serif text-h1 text-text-primary">
                <AnimatedCounter
                  value={item.value}
                  format={n =>
                    item.format ? n.toLocaleString('en-PK') : String(Math.round(n))
                  }
                />
                {item.suffix}
              </p>
              <p className="mt-1 text-ui text-text-secondary">{item.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Shop by room. A carousel because the set is short and browsing by */}
      {/* room is how people actually start.                                */}
      {/* ---------------------------------------------------------------- */}
      <section className="py-section-md">
        <div className="mx-auto max-w-content px-5 sm:px-6 lg:px-8">
          <Reveal className="mb-10">
            <p className="mb-2 text-overline uppercase text-caramel-700">Browse</p>
            <h2 className="font-serif text-h1 text-text-primary">Start from the room</h2>
          </Reveal>

          <Carousel label="Shop by room" perView={{ base: 1, sm: 2, lg: 4 }} loop={false}>
            {ROOMS.map(room => (
              <Link
                key={room.slug}
                href={`/products?category=${room.id}`}
                className="stage lift-on-hover group block overflow-hidden rounded-md shadow-e1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-surface-subtle">
                  <Tilt max={5} className="h-full w-full">
                    <Image
                      src={room.image}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 24vw, (min-width: 640px) 45vw, 90vw"
                      className="scale-105 object-cover transition-transform duration-slow ease-standard group-hover:scale-110"
                    />
                  </Tilt>
                  <div aria-hidden="true" className="scrim-fade" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-5">
                    <span className="font-serif text-h2 text-white">{room.name}</span>
                    <ArrowRight
                      className="h-5 w-5 shrink-0 text-white transition-transform duration-fast group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </Link>
            ))}
          </Carousel>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Why. Cards lift under the pointer -- transform and shadow only,   */}
      {/* so nothing inside them can drift out of contrast.                 */}
      {/* ---------------------------------------------------------------- */}
      <section className="bg-surface-subtle py-section-md">
        <div className="mx-auto max-w-content px-5 sm:px-6 lg:px-8">
          <Reveal className="mb-12 text-center">
            <h2 className="font-serif text-h1 text-text-primary">Why people keep coming back</h2>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature, index) => (
              <Reveal key={feature.title} index={index}>
                <Card className="lift-on-hover h-full bg-surface text-center">
                  <div className="mb-4 flex justify-center">
                    <span className="rounded-full bg-caramel-100 p-3 shadow-e1">
                      <feature.icon className="h-6 w-6 text-caramel-700" aria-hidden="true" />
                    </span>
                  </div>
                  <h3 className="mb-2 text-h3 text-text-primary">{feature.title}</h3>
                  <p className="text-body text-text-secondary">{feature.description}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* This season.                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="bg-surface py-section-md">
        <div className="mx-auto max-w-content px-5 sm:px-6 lg:px-8">
          <Reveal className="mb-12 text-center">
            <h2 className="mb-3 font-serif text-h1 text-text-primary">This season</h2>
            <p className="text-body-lg text-text-secondary">
              A short list, chosen because they earn the room
            </p>
          </Reveal>

          {status === 'loading' ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          ) : status === 'error' ? (
            <ErrorState
              title="We could not load this season's picks"
              description="The catalogue is still there, and this usually clears on a second try."
              onRetry={loadFeatured}
            />
          ) : featuredProducts.length === 0 ? (
            <EmptyState
              title="Nothing featured just now"
              description="The full catalogue is still there."
              action={
                <Button asChild>
                  <Link href="/products">Browse everything</Link>
                </Button>
              }
            />
          ) : (
            /* Manual only -- nothing autoplays on a page somebody is reading. */
            <Carousel label="Featured furniture" perView={{ base: 1, sm: 2, lg: 4 }} loop={false}>
              {featuredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </Carousel>
          )}

          <div className="mt-12 text-center">
            <Button asChild size="lg" variant="outline" rightIcon={<ArrowRight className="h-4 w-4" />}>
              <Link href="/products">View all products</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* What people say.                                                  */}
      {/* ---------------------------------------------------------------- */}
      <section className="bg-surface-subtle py-section-md">
        <div className="mx-auto max-w-content px-5 sm:px-6 lg:px-8">
          <Reveal className="mb-10 text-center">
            <h2 className="font-serif text-h1 text-text-primary">What people say</h2>
          </Reveal>

          <Carousel label="Customer accounts" perView={{ base: 1, lg: 3 }} loop={false}>
            {VOICES.map(voice => (
              <Card key={voice.name} className="lift-on-hover h-full bg-surface">
                <Quote className="mb-4 h-6 w-6 text-caramel-300" aria-hidden="true" />
                <blockquote className="text-body text-text-primary">{voice.quote}</blockquote>
                <footer className="mt-5 text-ui text-text-secondary">
                  <span className="font-medium text-text-primary">{voice.name}</span>
                  <span aria-hidden="true"> · </span>
                  {voice.place}
                </footer>
              </Card>
            ))}
          </Carousel>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Closing panel, over a drifting photograph.                        */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative isolate overflow-hidden bg-bark-950 py-section-lg">
        <Parallax distance={50} className="absolute inset-0 -z-10 scale-110">
          <Image
            src="/seed/products/grand-dining-table-lg.webp"
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-30"
          />
        </Parallax>
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-bark-950/65" />

        <div className="relative mx-auto max-w-prose px-5 sm:px-6">
          <Reveal className="glass-dark rounded-xl p-8 text-center shadow-float sm:p-12">
            <h2 className="mb-4 font-serif text-h1 text-white">Not sure where to start?</h2>
            <p className="mb-8 text-body-lg text-bark-100">
              Tell us about the room and we will put a shortlist together. No obligation,
              no showroom pressure.
            </p>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
            >
              <Link href="/contact">Talk to us</Link>
            </Button>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
