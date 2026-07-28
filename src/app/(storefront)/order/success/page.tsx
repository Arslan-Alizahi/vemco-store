'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Package, Truck, Clock } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'

function OrderSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const orderId = searchParams.get('orderId')

  useEffect(() => {
    if (!orderId) {
      router.push('/')
      return
    }

    // Fetch order details
    fetch(`/api/stripe/check-payment?orderId=${orderId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setOrder(data.data)
        }
        setLoading(false)
      })
      .catch(error => {
        console.error('Error fetching order:', error)
        setLoading(false)
      })
  }, [orderId, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-caramel-600"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full p-8 text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-4">Order Not Found</h1>
          <p className="text-text-secondary mb-6">We couldn't find your order. Please check your email for order confirmation.</p>
          <Link href="/">
            <Button>Go to Home</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-text-primary mb-2">Order Confirmed!</h1>
          <p className="text-xl text-text-secondary">Thank you for your purchase</p>
        </div>

        {/* Order Details Card */}
        <Card className="p-8 mb-6">
          <div className="border-b border-border-subtle pb-6 mb-6">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Order Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-text-tertiary">Order Number</p>
                <p className="text-lg font-semibold text-text-primary">{order.orderNumber}</p>
              </div>
              <div>
                <p className="text-sm text-text-tertiary">Total Amount</p>
                <p className="text-lg font-semibold tabular-nums text-text-primary">
                  {formatCurrency(order.total ?? 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Delivery Information */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-text-primary">What's Next?</h3>
            
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-text-primary">Order Processing</h4>
                <p className="text-sm text-text-secondary">We're preparing your order for shipment</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Truck className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-medium text-text-primary">Estimated Delivery</h4>
                <p className="text-sm text-text-secondary">Your order will be delivered within 3-5 business days</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="font-medium text-text-primary">Order Confirmation</h4>
                <p className="text-sm text-text-secondary">A confirmation email has been sent to your email address</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/products">
            <Button variant="primary" size="lg" className="w-full sm:w-auto">
              Continue Shopping
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Go to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-caramel-600"></div>
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  )
}

