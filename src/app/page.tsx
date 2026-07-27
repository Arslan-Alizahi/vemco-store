'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { Trees, Ruler, Truck, Hammer, ArrowRight } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import { Product } from '@/types/product'

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Fetch featured products
    fetch('/api/products?is_featured=true&limit=6')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFeaturedProducts(data.data.products || [])
        }
      })
      .catch(error => console.error('Error fetching products:', error))
      .finally(() => setIsLoading(false))
  }, [])

  const features = [
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />

      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden bg-bark-900 text-white"
      >
        {/* Warm ambient wash, so the panel reads as lit walnut rather than a
            flat dark block. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_0%,theme(colors.caramel.800)_0%,transparent_60%)] opacity-70"
        />

        <div className="relative mx-auto max-w-content px-5 py-section-lg sm:px-6 lg:px-8">
          <div className="mx-auto max-w-prose text-center">
            <motion.p
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05, duration: 0.4 }}
              className="mb-5 text-overline uppercase text-caramel-300"
            >
              Made to be lived with
            </motion.p>

            <motion.h1
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="mb-6 font-serif text-[2.5rem] leading-[1.05] tracking-[-0.03em] md:text-display"
            >
              Furniture for considered spaces
            </motion.h1>

            <motion.p
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.18, duration: 0.5 }}
              className="mx-auto mb-10 max-w-[46ch] text-body-lg text-bark-200"
            >
              Solid wood, honest joinery, and pieces that earn their place. Built to
              outlast the room you bought them for.
            </motion.p>

            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.26, duration: 0.5 }}
              className="flex flex-col justify-center gap-3 sm:flex-row"
            >
              <Link href="/products">
                <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />} fullWidth>
                  Shop the collection
                </Button>
              </Link>
              <Link href="/about">
                <Button
                  size="lg"
                  variant="outline"
                  fullWidth
                  className="border-white/25 text-white hover:bg-white/10"
                >
                  Our story
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section className="py-section-md">
        <div className="mx-auto max-w-content px-5 sm:px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mb-12 text-center font-serif text-h1 text-text-primary"
          >
            Why people keep coming back
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
              >
                <Card className="h-full text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="rounded-full bg-caramel-100 p-3">
                      <feature.icon className="h-6 w-6 text-caramel-700" aria-hidden="true" />
                    </div>
                  </div>
                  <h3 className="mb-2 text-h3 text-text-primary">{feature.title}</h3>
                  <p className="text-body text-text-secondary">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-surface py-section-md">
        <div className="mx-auto max-w-content px-5 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mb-12 text-center"
          >
            <h2 className="mb-3 font-serif text-h1 text-text-primary">This season</h2>
            <p className="text-body-lg text-text-secondary">
              A short list, chosen because they earn the room
            </p>
          </motion.div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" label="Loading products..." />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ scale: 0.9, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                >
                  <Card interactive noPadding className="group h-full">
                    <Link href={`/products/${product.slug}`} className="block">
                      {/* 4:5 portrait -- furniture reads taller than it does
                          square. The transform is on the image inside its own
                          clipped frame, never on the card, so type stays sharp
                          and nothing spills into the grid gutter. */}
                      <div className="relative aspect-[4/5] overflow-hidden bg-surface-subtle">
                        <img
                          src={product.primary_image || '/placeholder.png'}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-slow ease-standard group-hover:scale-[1.04]"
                        />
                        {product.compare_at_price && (
                          <div className="absolute left-3 top-3">
                            <Badge variant="sale" size="sm">
                              Sale
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="mb-1 text-h3 text-text-primary">{product.name}</h3>
                        <p className="mb-4 line-clamp-2 text-ui text-text-secondary">
                          {product.description}
                        </p>
                        <div className="flex items-baseline gap-2">
                          {/* Price is neutral, not brand. Colouring the base
                              price leaves nothing louder for a markdown. */}
                          <span className="text-h3 tabular-nums text-text-primary">
                            {formatCurrency(product.price)}
                          </span>
                          {product.compare_at_price && (
                            <span className="text-ui tabular-nums text-text-tertiary line-through">
                              {formatCurrency(product.compare_at_price)}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link href="/products">
              <Button size="lg" variant="outline" rightIcon={<ArrowRight />}>
                View All Products
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-caramel-700 py-section-md text-white">
        <div className="mx-auto max-w-prose px-5 text-center sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="mb-4 font-serif text-h1">Not sure where to start?</h2>
            <p className="mb-8 text-body-lg text-caramel-100">
              Tell us about the room and we will put a shortlist together. No
              obligation, no showroom pressure.
            </p>
            <Link href="/contact">
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
              >
                Talk to us
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}