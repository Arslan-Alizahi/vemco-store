'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Minus, Plus, ShieldCheck, ShoppingBag, Trash2, Truck } from 'lucide-react'
import Container from '@/components/layout/Container'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import IconButton from '@/components/ui/IconButton'
import Money from '@/components/ui/Money'
import EmptyState from '@/components/ui/EmptyState'
import { ProductCardSkeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { useCart } from '@/hooks/useCart'
import { calculateTax, calculateTotal, validateEmail } from '@/lib/utils'

interface Fields {
  name: string
  email: string
  phone: string
  address: string
  city: string
}

const EMPTY: Fields = { name: '', email: '', phone: '', address: '', city: '' }

export default function CartPage() {
  const router = useRouter()
  // isLoading was previously discarded, so on every single load the page
  // rendered "Your cart is empty" for a frame before localStorage was read --
  // including for people who had a full cart.
  const { cart, isLoading, updateQuantity, removeFromCart, addToCart, subtotal } = useCart()
  const { addToast } = useToast()

  const [values, setValues] = useState<Fields>(EMPTY)
  const [errors, setErrors] = useState<Partial<Fields>>({})
  const [isProcessing, setIsProcessing] = useState(false)

  const tax = calculateTax(subtotal)
  const shipping = subtotal >= 100000 ? 0 : 2500
  const total = calculateTotal(subtotal, tax, shipping, 0)

  const set =
    (field: keyof Fields) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues(current => ({ ...current, [field]: event.target.value }))
      setErrors(current => ({ ...current, [field]: undefined }))
    }

  const validate = () => {
    const next: Partial<Fields> = {}
    if (!values.name.trim()) next.name = 'We need a name for the delivery'
    if (!values.email.trim()) next.email = 'We send the order confirmation here'
    else if (!validateEmail(values.email)) next.email = 'That does not look like an email address'
    if (!values.phone.trim()) next.phone = 'The delivery team calls before they set off'
    if (!values.address.trim()) next.address = 'We need somewhere to deliver to'
    if (!values.city.trim()) next.city = 'City decides the delivery rate'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleRemove = (productId: number) => {
    const removed = cart.find(item => item.product_id === productId)
    removeFromCart(productId)
    addToast(`${removed?.product_name ?? 'Item'} removed`, 'info', 6000, {
      label: 'Undo',
      onClick: () => removed && addToCart(removed),
    })
  }

  const handleCheckout = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) return

    setIsProcessing(true)
    try {
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: values.name,
          customer_email: values.email,
          customer_phone: values.phone,
          shipping_address: `${values.address}, ${values.city}`,
          items: cart.map(item => ({
            product_id: item.product_id,
            product_name: item.product_name,
            product_sku: item.product_sku,
            product_image: item.product_image,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
          tax,
          shipping_cost: shipping,
          payment_method: 'stripe',
        }),
      })

      const orderData = await orderRes.json()
      if (!orderData.success) {
        addToast(orderData.message || 'We could not create the order', 'error')
        setIsProcessing(false)
        return
      }

      const order = orderData.data

      const paymentRes = await fetch('/api/stripe/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      })
      const paymentData = await paymentRes.json()

      if (!paymentData.success) {
        addToast(paymentData.message || 'We could not start the payment', 'error')
        setIsProcessing(false)
        return
      }

      // The cart is deliberately NOT cleared here. It used to be emptied before
      // the redirect, so anyone who abandoned payment came back to an empty
      // cart with nothing to resume. It is cleared on the success page instead.
      if (paymentData.data.paymentUrl) {
        window.location.href = paymentData.data.paymentUrl
      } else {
        router.push(`/order/success?orderId=${order.id}`)
      }
    } catch (error) {
      console.error('Checkout failed:', error)
      addToast('Checkout failed. Nothing has been charged.', 'error')
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <Container className="py-section-md">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <ProductCardSkeleton />
          </div>
        </div>
      </Container>
    )
  }

  if (cart.length === 0) {
    return (
      <Container className="py-section-md">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Nothing saved for checkout yet. Everything in the catalogue lists full dimensions, so you can check it fits before you commit."
          action={
            <Button asChild size="lg">
              <Link href="/products">Browse furniture</Link>
            </Button>
          }
        />
      </Container>
    )
  }

  return (
    <Container className="py-section-md">
      <PageHeader
        title="Your cart"
        lead={`${cart.length} ${cart.length === 1 ? 'piece' : 'pieces'} ready for checkout.`}
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <section aria-label="Cart items" className="space-y-4 lg:col-span-2">
          {cart.map(item => (
            <Card key={item.product_id} noPadding className="p-4 sm:p-5">
              {/* Two rows on narrow screens: details above, controls below.
                  A single row pushed the delete button off the edge on any
                  realistic product name. */}
              <div className="flex gap-4">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-sm bg-surface-subtle sm:h-28 sm:w-28">
                  {item.product_image && (
                    <Image
                      src={item.product_image}
                      alt={item.product_name}
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <Link
                    href={`/products/${item.product_slug}`}
                    className="truncate rounded-sm text-body font-medium text-text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {item.product_name}
                  </Link>
                  <p className="mt-0.5 font-mono text-caption text-text-tertiary">
                    {item.product_sku}
                  </p>
                  <Money amount={item.unit_price} className="mt-1 text-body text-text-primary" />

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1 rounded-sm border border-border-subtle">
                      <IconButton
                        label={`Decrease quantity of ${item.product_name}`}
                        size="sm"
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                      >
                        <Minus />
                      </IconButton>
                      <span className="w-8 text-center text-ui font-medium tabular-nums">
                        {item.quantity}
                      </span>
                      <IconButton
                        label={`Increase quantity of ${item.product_name}`}
                        size="sm"
                        disabled={item.quantity >= item.stock_quantity}
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                      >
                        <Plus />
                      </IconButton>
                    </div>

                    <IconButton
                      label={`Remove ${item.product_name} from cart`}
                      variant="danger"
                      size="sm"
                      onClick={() => handleRemove(item.product_id)}
                    >
                      <Trash2 />
                    </IconButton>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          <Button asChild variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            <Link href="/products">Continue shopping</Link>
          </Button>
        </section>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 text-h3 text-text-primary">Order summary</h2>
            <dl className="space-y-2 border-b border-border-subtle pb-4 text-ui">
              <div className="flex justify-between">
                <dt className="text-text-secondary">Subtotal</dt>
                <dd>
                  <Money amount={subtotal} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Sales tax</dt>
                <dd>
                  <Money amount={tax} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Delivery</dt>
                <dd>{shipping === 0 ? 'Free' : <Money amount={shipping} />}</dd>
              </div>
            </dl>
            <div className="flex items-baseline justify-between pt-4">
              <span className="text-body font-medium text-text-primary">Total</span>
              <Money amount={total} className="text-h2 text-text-primary" />
            </div>
            {shipping > 0 && (
              <p className="mt-3 text-caption text-text-tertiary">
                Free city delivery on orders over <Money amount={100000} bare />.
              </p>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 text-h3 text-text-primary">Delivery details</h2>

            {/* A real form: submits on Enter, and every field carries an
                autocomplete token so the browser can fill it. Previously this
                was loose inputs in a div with no autocomplete at all. */}
            <form onSubmit={handleCheckout} noValidate className="space-y-4">
              <Input
                label="Full name"
                name="name"
                autoComplete="name"
                value={values.name}
                onChange={set('name')}
                error={errors.name}
                required
              />
              <Input
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={set('email')}
                error={errors.email}
                required
              />
              <Input
                label="Phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={values.phone}
                onChange={set('phone')}
                error={errors.phone}
                required
              />
              <Textarea
                label="Address"
                name="address"
                rows={3}
                autoComplete="street-address"
                placeholder="House and street, plus any access notes"
                value={values.address}
                onChange={set('address')}
                error={errors.address}
                required
              />
              <Input
                label="City"
                name="city"
                autoComplete="address-level2"
                value={values.city}
                onChange={set('city')}
                error={errors.city}
                required
              />

              <Button type="submit" size="lg" fullWidth isLoading={isProcessing}>
                {isProcessing ? 'Starting payment' : 'Continue to payment'}
              </Button>
            </form>

            <ul className="mt-5 space-y-2 border-t border-border-subtle pt-5">
              <li className="flex items-center gap-2 text-caption text-text-secondary">
                <ShieldCheck className="h-4 w-4 shrink-0 text-success-600" aria-hidden="true" />
                Card details never touch our servers
              </li>
              <li className="flex items-center gap-2 text-caption text-text-secondary">
                <Truck className="h-4 w-4 shrink-0 text-success-600" aria-hidden="true" />
                Delivered in 3-5 working days
              </li>
            </ul>

            <p className="mt-4 text-caption text-text-tertiary">
              By continuing you agree to our{' '}
              <Link href="/policies/terms" className="underline underline-offset-4">
                terms
              </Link>{' '}
              and{' '}
              <Link href="/policies/returns" className="underline underline-offset-4">
                returns policy
              </Link>
              .
            </p>
          </Card>
        </div>
      </div>
    </Container>
  )
}
