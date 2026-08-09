'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import { ProductCardSkeleton } from '@/components/ui/Skeleton'
import { Reveal } from '@/components/ui/motion/Reveal'
import ProductCard from '@/components/storefront/ProductCard'
import Panel, { Eyebrow } from '@/components/layout/Panel'
import Money from '@/components/ui/Money'
import { BRAND_SHORT } from '@/lib/brand'
import { Product } from '@/types/product'

/**
 * The four things a person weighs before spending a month's salary on a
 * sofa, in the order they weigh them. Not features -- objections.
 */
const ASSURANCES = [
  { figure: '5 yr', label: 'Structural guarantee' },
  { figure: '3–5 days', label: 'Delivered nationwide' },
  { figure: 'Room of choice', label: 'Carried in and unwrapped' },
  { figure: '14 days', label: 'To change your mind' },
]

/**
 * What the furniture is actually made of.
 *
 * A specification list rather than a virtues list: "solid wood" is a claim
 * anyone can print, and "Sheesham, kiln-dried to 10% moisture" is one only a
 * shop that did it can print. The numbers are the argument.
 */
const MATERIALS = [
  { name: 'Sheesham & walnut', note: 'Kiln-dried to 10% moisture, so it will not move in a Haripur summer' },
  { name: 'Mortise and tenon', note: 'Cut and glued, never stapled. The joint outlives the finish' },
  { name: 'Velvet at 45,000 rubs', note: 'Martindale-tested upholstery, rated for daily family use' },
  { name: 'High-resilience foam', note: '35kg/m³ in every seat, so the cushion returns after eight years' },
]

const SERVICES = [
  {
    title: 'Measured before it ships',
    body: 'Every listing carries full dimensions and a doorway clearance note, because the commonest reason furniture goes back is that it never got in.',
  },
  {
    title: 'Made to order, honestly dated',
    body: 'Pieces built for you take four to six weeks. We put the date in writing before you pay, and we tell you the day it changes.',
  },
  {
    title: 'Pay part now, the rest on delivery',
    body: 'Reserve a piece with an advance at the showroom and settle the balance when it arrives. The bill shows both, every time.',
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

  /** The piece that gets the spotlight card in the bento row. */
  const spotlight = featuredProducts[0]
  const spotlightImage = spotlight?.primary_image || spotlight?.images?.[0]?.image_url

  return (
    /*
      One stack of panels on a tinted ground, with the gap between them as
      the only divider. No section has its own background colour and no
      section has a border: the ground shows through the gaps and does both
      jobs at once. That is why the page ground is darker than the panels --
      invert those two and every gap in this layout stops existing.
    */
    <div className="bg-canvas">
      <div className="mx-auto max-w-wide space-y-3 px-3 pb-3 sm:space-y-4 sm:px-4 sm:pb-4">
        {/* ------------------------------------------------------------ */}
        {/* Hero. Type on the left, the piece itself on the right.        */}
        {/* ------------------------------------------------------------ */}
        <Panel as="section" pad="none" className="grid lg:grid-cols-2">
          <div className="order-2 flex flex-col justify-center p-7 sm:p-10 lg:order-1 lg:p-14">
            <Eyebrow>Solid wood, honestly built</Eyebrow>

            {/*
              The measure is in ch, not pixels, so the headline keeps the
              same number of words per line as the type scale changes -- a
              pixel measure re-breaks the line at every breakpoint and the
              hero reads differently on every screen.

              It lands on three lines in this column, and that is the right
              answer rather than a compromise: at leading 1.02 the three
              lines lock into a block the eye reads as one shape, and buying
              back a line would mean shrinking the display type, which is the
              only thing on the page doing the work of a shopfront.
            */}
            <h1 className="mt-6 max-w-[16ch] font-serif text-[2.75rem] leading-[1.02] tracking-[-0.025em] text-text-primary sm:text-display-serif lg:text-hero">
              Furniture for considered spaces
            </h1>

            <p className="mt-6 max-w-[46ch] text-body-lg text-text-secondary">
              Solid wood, real joinery, and the full measurements on every listing.
              Delivered to the room of your choice, anywhere in Pakistan.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                <Link href="/products">Shop the collection</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href="/about">How we build</Link>
              </Button>
            </div>
          </div>

          <div className="relative order-1 min-h-[280px] bg-surface-subtle sm:min-h-[360px] lg:order-2 lg:min-h-[560px]">
            {/* Decorative: the headline already names the subject, so a
                description here would make a screen reader read the same
                idea twice. */}
            <Image
              src="/seed/products/classic-sofa-set-lg.webp"
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </Panel>

        {/* ------------------------------------------------------------ */}
        {/* The four objections, answered in four figures.                */}
        {/* ------------------------------------------------------------ */}
        <Panel as="section" pad="none" aria-label="What every order includes">
          {/*
            Hairlines by gap, not by border.
            A one-pixel gap over the border colour draws exactly the rules a
            grid needs at every column count -- and never the ones it does
            not, which is what nth-child border juggling always eventually
            gets wrong at one breakpoint nobody tested.
          */}
          <ul className="grid grid-cols-2 gap-px bg-border-subtle lg:grid-cols-4">
            {ASSURANCES.map(item => (
              <li key={item.label} className="bg-surface px-6 py-7 sm:px-8">
                <p className="font-serif text-h2 text-text-primary">{item.figure}</p>
                <p className="mt-1.5 text-ui text-text-secondary">{item.label}</p>
              </li>
            ))}
          </ul>
        </Panel>

        {/* ------------------------------------------------------------ */}
        {/* Bento: what it is made of, who makes it, and one piece.       */}
        {/* ------------------------------------------------------------ */}
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
          <Reveal className="h-full">
            <Panel as="section" pad="md" className="h-full">
              <Eyebrow>Our materials</Eyebrow>
              <h2 className="mt-5 font-serif text-h1 text-text-primary">
                What it is made of
              </h2>
              <dl className="mt-8 space-y-6">
                {MATERIALS.map(material => (
                  <div key={material.name}>
                    <dt className="text-body font-medium text-text-primary">{material.name}</dt>
                    <dd className="mt-1 text-ui text-text-secondary">{material.note}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          </Reveal>

          {/*
            The one dark panel on the page. A single inversion reads as
            emphasis; a second one reads as a colour scheme, and then neither
            of them is emphasis any more.
          */}
          <Reveal index={1} className="h-full">
            <Panel as="section" tone="inverse" pad="none" className="relative flex h-full min-h-[420px] flex-col justify-end">
              <Image
                src="/seed/products/round-walnut-coffee-table-lg.webp"
                alt=""
                fill
                quality={60}
                sizes="(min-width: 1024px) 33vw, 100vw"
                className="object-cover opacity-30"
              />
              {/*
                A flat scrim first, then the gradient.

                The gradient alone is nearly transparent at the top of the
                panel, which meant the heading's contrast depended entirely
                on how dark this particular photograph happened to be behind
                this particular line. Swap the photograph for a lighter one
                and the type quietly drops below AA with nothing in the build
                to catch it. The flat layer makes the floor a property of the
                panel instead: at 30% image over a half scrim, even a pure
                white pixel leaves the body text above 7:1.
              */}
              <div aria-hidden="true" className="absolute inset-0 bg-bark-950/50" />
              <div aria-hidden="true" className="absolute inset-0 bg-fade-up" />
              <div className="relative p-7 sm:p-10">
                <Eyebrow tone="inverse">In the workshop</Eyebrow>
                <h2 className="mt-4 font-serif text-h1 text-bark-50">
                  Eleven people, one bench at a time
                </h2>
                <p className="mt-4 max-w-[38ch] text-body text-bark-200">
                  Nothing here comes off a container. Every frame is cut, joined and
                  finished in our Haripur workshop, and the person who built yours signs
                  the underside.
                </p>
                <Link
                  href="/about"
                  className="mt-7 inline-flex items-center gap-2 rounded-sm text-ui font-medium uppercase tracking-[0.12em] text-bark-50 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-caramel-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-inverse"
                >
                  Meet the workshop
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </Panel>
          </Reveal>

          {/*
            One real piece, priced. A shop that will not show a price on its
            own homepage is telling you something about the price.
          */}
          <Reveal index={2} className="h-full">
            <Panel as="section" pad="none" className="flex h-full flex-col">
              <div className="relative aspect-[4/3] bg-surface-subtle lg:aspect-auto lg:flex-1">
                {spotlightImage && (
                  <Image
                    src={spotlightImage}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="p-7 sm:p-8">
                <Eyebrow>Piece of the month</Eyebrow>
                {spotlight ? (
                  <>
                    <h2 className="mt-4 font-serif text-h2 text-text-primary">
                      <Link
                        href={`/products/${spotlight.id}`}
                        className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                      >
                        {spotlight.name}
                      </Link>
                    </h2>
                    <p className="mt-3 text-body-lg text-text-primary">
                      <Money amount={spotlight.price} />
                    </p>
                  </>
                ) : (
                  <p className="mt-4 text-body text-text-secondary">
                    Loading this month&rsquo;s pick.
                  </p>
                )}
              </div>
            </Panel>
          </Reveal>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* The one sentence the shop would want remembered.              */}
        {/* ------------------------------------------------------------ */}
        <Panel as="section" pad="lg" tone="sunken" className="text-center">
          <Eyebrow>Why we do it this way</Eyebrow>
          <p className="mx-auto mt-6 max-w-[24ch] font-serif text-[2rem] leading-[1.12] tracking-[-0.02em] text-text-primary sm:max-w-[30ch] sm:text-display-serif">
            Cheap furniture is bought three times. We would rather you bought once.
          </p>
        </Panel>

        {/* ------------------------------------------------------------ */}
        {/* Featured pieces.                                              */}
        {/* ------------------------------------------------------------ */}
        <Panel as="section" pad="lg">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>Featured pieces</Eyebrow>
              <h2 className="mt-4 font-serif text-h1 text-text-primary">This season</h2>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-sm text-ui font-medium uppercase tracking-[0.12em] text-text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              View all
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

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
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.slice(0, 4).map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </Panel>

        {/* ------------------------------------------------------------ */}
        {/* How buying here works.                                        */}
        {/* ------------------------------------------------------------ */}
        <Panel as="section" pad="none">
          <div className="grid gap-px bg-border-subtle lg:grid-cols-3">
            {SERVICES.map(service => (
              <div key={service.title} className="bg-surface p-7 sm:p-10">
                <h2 className="font-serif text-h2 text-text-primary">{service.title}</h2>
                <p className="mt-3 text-body text-text-secondary">{service.body}</p>
              </div>
            ))}
          </div>
        </Panel>

        {/* ------------------------------------------------------------ */}
        {/* Closing. One question, one door.                              */}
        {/* ------------------------------------------------------------ */}
        <Panel as="section" pad="lg" className="text-center">
          <h2 className="font-serif text-h1 text-text-primary">Not sure where to start?</h2>
          <p className="mx-auto mt-4 max-w-[52ch] text-body-lg text-text-secondary">
            Tell {BRAND_SHORT} about the room — the size, the light, what it has to put up
            with — and we will send back a shortlist. No obligation, no showroom pressure.
          </p>
          <div className="mt-8">
            <Button asChild size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
              <Link href="/contact">Talk to us</Link>
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  )
}
