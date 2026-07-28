'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, Mail, Package, Truck } from 'lucide-react'
import Container from '@/components/layout/Container'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Money from '@/components/ui/Money'
import Spinner from '@/components/ui/Spinner'
import ErrorState from '@/components/ui/ErrorState'
import { useCart } from '@/hooks/useCart'

const NEXT_STEPS = [
  {
    icon: Mail,
    title: 'Confirmation email',
    body: 'On its way now, with your order number and everything you ordered.',
  },
  {
    icon: Package,
    title: 'We pick your order',
    body: 'Same day if you ordered before 3 PM, otherwise the next working day.',
  },
  {
    icon: Truck,
    title: 'Delivery call',
    body: 'We ring the day before with a two-hour window, and again when the team sets off.',
  },
]

function OrderSuccessContent() {
  const params = useSearchParams()
  const router = useRouter()
  const orderId = params.get('orderId')

  const { clearCart } = useCart()
  const [order, setOrder] = useState<any>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const cleared = useRef(false)

  // The cart is emptied here, not before the redirect to payment. Clearing it
  // early meant an abandoned payment left the customer with an empty cart and
  // no way to resume -- the single worst moment to lose a basket.
  useEffect(() => {
    if (cleared.current) return
    cleared.current = true
    clearCart()
  }, [clearCart])

  useEffect(() => {
    if (!orderId) {
      router.push('/')
      return
    }

    fetch(`/api/stripe/check-payment?orderId=${orderId}`)
      .then(res => res.json())
      .then(data => {
        if (!data.success) throw new Error('Not found')
        setOrder(data.data)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [orderId, router])

  if (status === 'loading') {
    return (
      <Container className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" label="Confirming your order" showLabel />
      </Container>
    )
  }

  if (status === 'error') {
    return (
      <Container size="prose" className="py-section-md">
        <ErrorState
          title="We could not find that order"
          description="Your payment may still have gone through. Check your email for a confirmation, or contact us with the reference and we will look it up."
        />
        <div className="text-center">
          <Button asChild variant="outline">
            <Link href="/contact">Contact support</Link>
          </Button>
        </div>
      </Container>
    )
  }

  return (
    <Container size="prose" className="py-section-md">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success-50">
          <CheckCircle className="h-8 w-8 text-success-600" aria-hidden="true" />
        </div>
        <h1 className="mb-2 font-serif text-h1 text-text-primary">Order confirmed</h1>
        <p className="text-body-lg text-text-secondary">
          Thank you. We have started picking it already.
        </p>
      </div>

      <Card className="mb-8">
        <dl className="grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-caption uppercase tracking-[0.06em] text-text-tertiary">
              Order number
            </dt>
            <dd className="mt-1 font-mono text-body font-medium text-text-primary">
              {order.orderNumber}
            </dd>
          </div>
          <div className="sm:text-right">
            <dt className="text-caption uppercase tracking-[0.06em] text-text-tertiary">
              Total paid
            </dt>
            <dd className="mt-1">
              <Money amount={order.total ?? 0} className="text-h3 text-text-primary" />
            </dd>
          </div>
        </dl>
      </Card>

      <section aria-labelledby="next" className="mb-10">
        <h2 id="next" className="mb-5 text-h3 text-text-primary">
          What happens next
        </h2>
        <ol className="space-y-5">
          {NEXT_STEPS.map(step => (
            <li key={step.title} className="flex gap-4">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-caramel-100">
                <step.icon className="h-4 w-4 text-caramel-700" aria-hidden="true" />
              </div>
              <div>
                <p className="text-body font-medium text-text-primary">{step.title}</p>
                <p className="text-ui text-text-secondary">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/products">Continue shopping</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/contact">Question about this order</Link>
        </Button>
      </div>
    </Container>
  )
}

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <Container className="flex min-h-[50vh] items-center justify-center">
          <Spinner size="lg" />
        </Container>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  )
}
