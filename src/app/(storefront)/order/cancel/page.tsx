'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CreditCard, XCircle } from 'lucide-react'
import Container from '@/components/layout/Container'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Money from '@/components/ui/Money'
import Spinner from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'

function OrderCancelContent() {
  const params = useSearchParams()
  const router = useRouter()
  const orderId = params.get('orderId')
  const { addToast } = useToast()

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [resuming, setResuming] = useState(false)

  useEffect(() => {
    if (!orderId) {
      router.push('/')
      return
    }
    fetch(`/api/stripe/check-payment?orderId=${orderId}`)
      .then(res => res.json())
      .then(data => setOrder(data.success ? data.data : null))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false))
  }, [orderId, router])

  /**
   * Resume the payment on the order that already exists.
   *
   * The primary action here used to be "Back to Cart" — pointing at a cart
   * that checkout had already emptied before the redirect. The most valuable
   * recovery moment in the whole funnel led to an empty page.
   */
  const resume = async () => {
    setResuming(true)
    try {
      const res = await fetch('/api/stripe/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      const data = await res.json()

      if (data.success && data.data?.paymentUrl) {
        window.location.href = data.data.paymentUrl
        return
      }
      addToast(data.message || 'We could not restart the payment', 'error')
    } catch (error) {
      console.error('Failed to resume payment:', error)
      addToast('We could not restart the payment', 'error')
    } finally {
      setResuming(false)
    }
  }

  if (loading) {
    return (
      <Container className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </Container>
    )
  }

  return (
    <Container size="prose" className="py-section-md">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-surface-subtle">
          <XCircle className="h-8 w-8 text-text-tertiary" aria-hidden="true" />
        </div>
        <h1 className="mb-2 font-serif text-h1 text-text-primary">Payment not completed</h1>
        <p className="text-body-lg text-text-secondary">
          Nothing has been charged, and your order is still here waiting.
        </p>
      </div>

      {order && (
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
                Amount due
              </dt>
              <dd className="mt-1">
                <Money amount={order.total ?? 0} className="text-h3 text-text-primary" />
              </dd>
            </div>
          </dl>
        </Card>
      )}

      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <Button
          size="lg"
          onClick={resume}
          isLoading={resuming}
          leftIcon={<CreditCard className="h-4 w-4" />}
        >
          Resume payment
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/products">Keep browsing</Link>
        </Button>
      </div>

      <p className="mt-8 text-center text-ui text-text-secondary">
        Prefer to pay another way, or want to change something?{' '}
        <Link href="/contact" className="underline underline-offset-4">
          Talk to us
        </Link>{' '}
        and quote your order number.
      </p>
    </Container>
  )
}

export default function OrderCancelPage() {
  return (
    <Suspense
      fallback={
        <Container className="flex min-h-[50vh] items-center justify-center">
          <Spinner size="lg" />
        </Container>
      }
    >
      <OrderCancelContent />
    </Suspense>
  )
}
