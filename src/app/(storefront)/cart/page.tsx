'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Minus, Phone, Plus, ShieldCheck, ShoppingBag, Trash2, Truck } from 'lucide-react'
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
import { calculateTotal, validateEmail } from '@/lib/utils'
import { shippingFor } from '@/lib/shipping'
import { cn } from '@/lib/cn'

/**
 * Read once at module scope. NEXT_PUBLIC_ variables are inlined at build
 * time, so this is a constant in the bundle rather than a lookup per render.
 */
const isShowcase = process.env.NEXT_PUBLIC_SHOWCASE === 'true'

interface Fields {
  name: string
  email: string
  phone: string
  city: string
  visitDate: string
  message: string
}

const EMPTY: Fields = { name: '', email: '', phone: '', city: '', visitDate: '', message: '' }

/** Visual order, so "the first error" means the first one down the page. */
const FIELD_ORDER: (keyof Fields)[] = ['name', 'phone', 'email', 'city', 'visitDate']

/**
 * The three conversations a customer can start.
 *
 * Nobody buys a sofa the way they buy a phone charger, so the shop does not
 * try to take the money here. Each of these ends the same way -- with the
 * shop's phone numbers and a reference to quote -- but the shop answers each
 * one differently, so the customer says which up front rather than the shop
 * guessing from a free-text message.
 */
const INTENTS = [
  {
    value: 'visit' as const,
    label: 'Book a showroom visit',
    hint: 'Come and see it before you decide',
  },
  {
    value: 'reserve' as const,
    label: 'Reserve this piece',
    hint: 'Talk it through, then hold it with an advance',
  },
  {
    value: 'delivery' as const,
    label: 'Buy and have it delivered',
    hint: 'Agree the price and a delivery day on the phone',
  },
]

type Intent = (typeof INTENTS)[number]['value']

/** Tomorrow, in the format a date input wants. Nobody visits yesterday. */
const earliestVisitDate = () => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
}

export default function CartPage() {
  const router = useRouter()
  // isLoading was previously discarded, so on every single load the page
  // rendered "Your cart is empty" for a frame before localStorage was read --
  // including for people who had a full cart.
  const { cart, isLoading, updateQuantity, removeFromCart, addToCart, subtotal, itemCount } =
    useCart()
  const { addToast } = useToast()

  const [values, setValues] = useState<Fields>(EMPTY)
  const [errors, setErrors] = useState<Partial<Fields>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [intent, setIntent] = useState<Intent>('visit')
  const formRef = useRef<HTMLFormElement>(null)

  // Shown here, decided on the server. Both read the same constants so the
  // figure the customer sees is the figure the order route computes.
  //
  // Online carries no tax at all -- see ONLINE_TAX_RATE. The listed price is
  // what gets charged, so there is no tax row to show and nothing here has to
  // agree with anything.
  const shipping = shippingFor(subtotal)
  const total = calculateTotal(subtotal, 0, shipping, 0)

  const set =
    (field: keyof Fields) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues(current => ({ ...current, [field]: event.target.value }))
      setErrors(current => ({ ...current, [field]: undefined }))
    }

  const validate = () => {
    const next: Partial<Fields> = {}

    // The phone number is the only thing this form genuinely needs. Everything
    // else can be settled in the conversation it exists to start, and every
    // extra required field is another reason to abandon it.
    if (!values.name.trim()) next.name = 'We need a name to put on the enquiry'
    if (!values.phone.trim()) next.phone = 'This is the number we will ring you on'

    // Optional, but if it is given it has to be usable -- a typo here means
    // the written copy with the reference never arrives.
    if (values.email.trim() && !validateEmail(values.email)) {
      next.email = 'That does not look like an email address'
    }

    if (intent === 'visit' && !values.visitDate) {
      next.visitDate = 'Which day would you like to come?'
    }

    setErrors(next)

    // Land on the first problem rather than leaving focus on the button that
    // just refused. The messages were already announced correctly, but a
    // keyboard user was left five fields below the first thing to fix, with
    // nothing telling them which one it was.
    const first = FIELD_ORDER.find(field => next[field])
    if (first) {
      requestAnimationFrame(() => {
        const element = formRef.current?.elements.namedItem(first)
        if (element instanceof HTMLElement) {
          element.focus()
          element.scrollIntoView({ block: 'center', behavior: 'smooth' })
        }
      })
    }

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

  const handleEnquiry = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) return

    setIsProcessing(true)
    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent,
          customer_name: values.name.trim(),
          customer_phone: values.phone.trim(),
          customer_email: values.email.trim() || null,
          city: values.city.trim() || null,
          visit_date: intent === 'visit' ? values.visitDate : null,
          message: values.message.trim() || null,
          /**
           * The names and prices as the customer was looking at them.
           *
           * Nothing is charged from this, so unlike an order there is no risk
           * in sending what is on screen -- and there is a real benefit: the
           * shop needs to know what the customer *thought* the price was when
           * they enquired, because that is what the phone call will be about.
           */
          items: cart.map(item => ({
            product_id: item.product_id,
            product_name: item.product_name,
            product_sku: item.product_sku,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
        }),
      })

      const data = await res.json()
      if (!data.success) {
        addToast(data.message || 'We could not send that enquiry', 'error')
        setIsProcessing(false)
        return
      }

      // The basket is deliberately NOT cleared. Nothing has been bought, and
      // a customer who rings the shop an hour later will want the same list
      // in front of them.
      router.push(`/enquiry/${data.data.reference}`)
    } catch (error) {
      console.error('Enquiry failed:', error)
      addToast('We could not send that just now. Nothing has been charged.', 'error')
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
        /**
         * Pieces, not lines. `cart.length` counts rows, so two of the same
         * sofa read as "1 piece" while the header beside it said "Cart, 2
         * items" -- the same basket described two ways on one screen. The
         * header is the one that is right: a customer buying two chairs has
         * two chairs coming.
         */
        lead={`${itemCount} ${itemCount === 1 ? 'piece' : 'pieces'} to ask about.`}
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
                    <div className="flex items-center gap-1 rounded-sm border border-border-subtle bg-surface shadow-well">
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
            <h2 className="mb-4 text-h3 text-text-primary">What you are asking about</h2>
            <dl className="space-y-2 border-b border-border-subtle pb-4 text-ui">
              <div className="flex justify-between">
                <dt className="text-text-secondary">Subtotal</dt>
                <dd>
                  <Money amount={subtotal} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Delivery</dt>
                <dd>{shipping === 0 ? 'Free' : <Money amount={shipping} />}</dd>
              </div>
            </dl>
            {/* "Listed at", not "Total". Nothing is being charged here, and
                a line saying Total invites the customer to believe the number
                is settled when the whole point of the next step is that it is
                not -- delivery, and anything they negotiate, come after. */}
            <div className="flex items-baseline justify-between pt-4">
              <span className="text-body font-medium text-text-primary">Listed at</span>
              <Money amount={total} className="text-h2 text-text-primary" />
            </div>
            {shipping > 0 && (
              <p className="mt-3 text-caption text-text-tertiary">
                Free city delivery on orders over <Money amount={100000} bare />.
              </p>
            )}
          </Card>

          {/* A showcase build has nowhere to record an order, so it says so
              rather than presenting a form that would fail on submit. Nobody
              should type their address into something that cannot use it. */}
          {isShowcase ? (
            <Card>
              <h2 className="mb-2 text-h3 text-text-primary">Ordering online is not open yet</h2>
              <p className="text-body text-text-secondary">
                This is a preview of the shop. Everything here is real — the pieces, the
                prices, the dimensions — but checkout is not taking orders on this site
                yet. Send us the list and we will put it together for you.
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/contact">Talk to us</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/products">Keep browsing</Link>
                </Button>
              </div>

              <p className="mt-5 text-caption text-text-tertiary">
                Your basket stays on this device, so it will still be here when you
                come back.
              </p>
            </Card>
          ) : (
          <Card>
            <h2 className="mb-1 text-h3 text-text-primary">Talk to us about this</h2>
            <p className="mb-5 text-ui text-text-secondary">
              Furniture is worth a conversation. Leave your details and we will call
              you — no payment is taken on this website.
            </p>

            {/* A real form: submits on Enter, and every field carries an
                autocomplete token so the browser can fill it. */}
            <form ref={formRef} onSubmit={handleEnquiry} noValidate className="space-y-4">
              {/*
                What kind of conversation, first, because it changes what the
                form asks for and what the shop says when it rings back. A
                radiogroup rather than a select: three options is few enough
                to show, and a customer choosing how to buy should see all of
                their choices at once rather than one at a time.
              */}
              <div
                role="radiogroup"
                aria-label="What would you like to do?"
                className="space-y-2"
              >
                {INTENTS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={intent === option.value}
                    onClick={() => setIntent(option.value)}
                    className={cn(
                      'w-full rounded-sm border px-4 py-3 text-left transition-colors duration-fast',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                      intent === option.value
                        ? 'border-action bg-surface-subtle'
                        : 'border-border-subtle hover:bg-surface-subtle'
                    )}
                  >
                    <span className="block text-body font-medium text-text-primary">
                      {option.label}
                    </span>
                    <span className="block text-caption text-text-secondary">
                      {option.hint}
                    </span>
                  </button>
                ))}
              </div>

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
                label="Phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0300 1234567"
                value={values.phone}
                onChange={set('phone')}
                error={errors.phone}
                helperText="The number we will ring you on"
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
                helperText="Optional — we send your reference here in writing"
              />
              <Input
                label="City"
                name="city"
                autoComplete="address-level2"
                value={values.city}
                onChange={set('city')}
                error={errors.city}
                helperText="Optional"
              />

              {intent === 'visit' && (
                <Input
                  label="Day you would like to come"
                  name="visitDate"
                  type="date"
                  min={earliestVisitDate()}
                  value={values.visitDate}
                  onChange={set('visitDate')}
                  error={errors.visitDate}
                  helperText="We are open seven days, 11am to 8pm"
                  required
                />
              )}

              <Textarea
                label="Anything you want to ask"
                name="message"
                rows={3}
                placeholder="Fabric, size, colour, how soon you need it…"
                value={values.message}
                onChange={set('message')}
              />

              <Button type="submit" size="lg" fullWidth isLoading={isProcessing}>
                {isProcessing ? 'Sending' : 'Send enquiry'}
              </Button>
            </form>

            <ul className="mt-5 space-y-2 border-t border-border-subtle pt-5">
              <li className="flex items-center gap-2 text-caption text-text-secondary">
                <Phone className="h-4 w-4 shrink-0 text-success-600" aria-hidden="true" />
                We call back within one working day
              </li>
              <li className="flex items-center gap-2 text-caption text-text-secondary">
                <ShieldCheck className="h-4 w-4 shrink-0 text-success-600" aria-hidden="true" />
                No payment on this website — nothing is charged
              </li>
              <li className="flex items-center gap-2 text-caption text-text-secondary">
                <Truck className="h-4 w-4 shrink-0 text-success-600" aria-hidden="true" />
                Delivery and price agreed on the phone
              </li>
            </ul>

            <p className="mt-4 text-caption text-text-tertiary">
              Sending this does not hold the piece — it is held once an advance is paid.
              See our{' '}
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
          )}
        </div>
      </div>
    </Container>
  )
}
