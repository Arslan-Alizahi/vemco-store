'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import IconButton from '@/components/ui/IconButton'
import Container from '@/components/layout/Container'
import PageHeader from '@/components/layout/PageHeader'
import Money from '@/components/ui/Money'
import { cn } from '@/lib/cn'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { PrintReceipt } from '@/components/ui/PrintReceipt'
import { PrintBookingBill } from '@/components/ui/PrintBookingBill'
import { Search, Plus, Minus, Trash2, Receipt, Package, UserRound } from 'lucide-react'
import { formatCurrency, generateReceiptNumber, calculateTax, calculateTotal, validateEmail } from '@/lib/utils'
import { Product } from '@/types/product'
import { BillingCartItem } from '@/types/billing'

export default function BillingPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<BillingCartItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [paymentModal, setPaymentModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountPaid, setAmountPaid] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [knownCustomer, setKnownCustomer] = useState<{
    id: number
    name: string
    email: string | null
  } | null>(null)
  const [currentReceipt, setCurrentReceipt] = useState<any>(null)
  const [showReceipt, setShowReceipt] = useState(false)

  /**
   * The two kinds of sale a furniture shop makes.
   *
   * `sale` finishes at the till: money in, goods out, change given. `booking`
   * is the one this trade runs on -- the customer picks a piece, leaves an
   * advance, and is given a date to collect. Same cart, same products; what
   * differs is that a booking owes a balance and carries a date, so the
   * dialog asks for a delivery date instead of offering change.
   */
  const [mode, setMode] = useState<'sale' | 'booking'>('sale')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [currentBooking, setCurrentBooking] = useState<any>(null)
  const [showBooking, setShowBooking] = useState(false)
  const { addToast } = useToast()

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0)
  const tax = calculateTax(subtotal)
  const total = calculateTotal(subtotal, tax, 0, 0)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/products?limit=100')
      const data = await res.json()
      if (data.success) {
        setProducts(data.data.products || [])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      addToast('Failed to load products', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const addProductToCart = (productId: string) => {
    const product = products.find(p => p.id.toString() === productId)
    if (!product) return

    if (product.stock_quantity <= 0) {
      addToast('Product is out of stock', 'error')
      return
    }

    const existingItem = cart.find(item => item.product_id === product.id)
    if (existingItem) {
      updateQuantity(product.id, existingItem.quantity + 1)
    } else {
      const newItem: BillingCartItem = {
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        product_image: product.primary_image || product.images?.[0]?.image_url,
        quantity: 1,
        unit_price: product.price,
        subtotal: product.price,
        stock_quantity: product.stock_quantity,
      }
      setCart([...cart, newItem])
    }
    setSelectedProduct('')
  }

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCart(cart.map(item => {
      if (item.product_id === productId) {
        const quantity = Math.min(newQuantity, item.stock_quantity)
        return {
          ...item,
          quantity,
          subtotal: quantity * item.unit_price,
        }
      }
      return item
    }))
  }

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product_id !== productId))
  }

  const clearCart = () => {
    setCart([])
    setAmountPaid('')
    setCustomerName('')
    setCustomerPhone('')
    setCustomerEmail('')
    setKnownCustomer(null)
    setDeliveryDate('')
  }

  /**
   * Three weeks out, which is what this shop quotes for a piece it has to
   * order in. A suggestion, not a rule -- the cashier changes it when the
   * customer asks for a particular day.
   */
  const defaultDeliveryDate = () => {
    const date = new Date()
    date.setDate(date.getDate() + 21)
    return date.toISOString().slice(0, 10)
  }

  /** Never offer a date that has already passed. */
  const earliestDeliveryDate = () => new Date().toISOString().slice(0, 10)

  const advance = parseFloat(amountPaid) || 0
  const balanceDue = Math.max(0, total - advance)

  const processBooking = async () => {
    if (cart.length === 0) {
      addToast('Cart is empty', 'error')
      return
    }

    // A booking is a promise to somebody. Without a name and a number there
    // is nobody to hand the furniture to in three weeks.
    if (!customerName.trim() || !customerPhone.trim()) {
      addToast('A booking needs the customer’s name and phone number', 'error')
      return
    }

    if (!deliveryDate) {
      addToast('Choose the delivery date', 'error')
      return
    }

    if (advance > total) {
      addToast('The advance is more than the total', 'error')
      return
    }

    if (emailError) {
      addToast('Check the email address, or clear it', 'error')
      return
    }

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          tax,
          discount: 0,
          delivery_date: deliveryDate,
          advance,
          payment_method: paymentMethod,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          customer_email: customerEmail.trim() || null,
        }),
      })

      const data = await res.json()

      if (data.success) {
        addToast('Booking taken', 'success')
        setCurrentBooking(data.data)
        setShowBooking(true)
        clearCart()
        setPaymentModal(false)
        fetchProducts()
      } else {
        addToast(data.message || 'We could not take that booking', 'error')
      }
    } catch (error) {
      console.error('Error creating booking:', error)
      addToast('We could not take that booking', 'error')
    }
  }

  const processBilling = async () => {
    if (cart.length === 0) {
      addToast('Cart is empty', 'error')
      return
    }

    const paid = parseFloat(amountPaid) || total
    if (paid < total) {
      addToast('Insufficient payment amount', 'error')
      return
    }

    if (emailError) {
      addToast('Check the email address, or clear it', 'error')
      return
    }

    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          payment_method: paymentMethod,
          amount_paid: paid,
          tax,
          discount: 0,
          customer_name: customerName.trim() || null,
          customer_phone: customerPhone.trim() || null,
          customer_email: customerEmail.trim() || null,
        }),
      })

      const data = await res.json()

      if (data.success) {
        addToast('Receipt created successfully!', 'success')
        // Show print receipt modal
        setCurrentReceipt(data.data)
        setShowReceipt(true)
        clearCart()
        setPaymentModal(false)
        // Refresh products to update stock
        fetchProducts()
      } else {
        addToast(data.message || 'Failed to create receipt', 'error')
      }
    } catch (error) {
      console.error('Error processing billing:', error)
      addToast('Failed to process billing', 'error')
    }
  }

  /**
   * Looks the number up as it is typed and fills the name in.
   *
   * Debounced, because a cashier types a phone number faster than a round
   * trip, and only once there are enough digits to be a real number rather
   * than the first two of one.
   */
  useEffect(() => {
    const digits = customerPhone.replace(/\D/g, '')
    if (digits.length < 7) {
      setKnownCustomer(null)
      return
    }

    let cancelled = false
    const timer = setTimeout(() => {
      fetch(`/api/customers/lookup?phone=${encodeURIComponent(digits)}`)
        .then(res => res.json())
        .then(data => {
          if (cancelled || !data.success || !data.data) {
            if (!cancelled) setKnownCustomer(null)
            return
          }
          setKnownCustomer(data.data)
          // Only fills a blank. Overwriting what the cashier just typed would
          // fight them over the spelling of somebody's name.
          setCustomerName(current => current.trim() || data.data.name)
          setCustomerEmail(current => current.trim() || data.data.email || '')
        })
        .catch(() => {
          if (!cancelled) setKnownCustomer(null)
        })
    }, 350)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [customerPhone])

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Only complains once there is something worth complaining about. An
  // optional field that shouts while it is half-typed is worse than one that
  // says nothing.
  const emailError =
    customerEmail.trim() && !validateEmail(customerEmail.trim())
      ? 'That does not look like an email address'
      : undefined

  const changeAmount = (parseFloat(amountPaid) || total) - total

  // The page no longer carries a data-print hook: printing works by rendering
  // the receipt into a container on <body>, not by hiding the page around it.
  return (
    <div className="min-h-screen bg-canvas">

      <Container className="py-section-sm">
        <PageHeader
          eyebrow="Counter"
          title="Point of sale"
          lead="Ring up a walk-in sale and print the receipt."
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Selection */}
          <Card>
            <h2 className="mb-4 text-h2 text-text-primary">Add products</h2>

            {/* Search */}
            <div className="mb-4">
              <Input
                placeholder="Search by name or SKU"
                leftIcon={<Search className="h-4 w-4" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Product Dropdown */}
            <div className="flex gap-2">
              <div className="flex-1">
                {/* A placeholder is not a label. This select had no
                    accessible name at all -- axe rates it critical, and it is
                    the control the whole till runs through. */}
                <Select
                  label="Product"
                  placeholder="Choose a product"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  options={filteredProducts.map(p => ({
                    value: p.id.toString(),
                    label: `${p.name} - ${formatCurrency(p.price)} (Stock: ${p.stock_quantity})`,
                    disabled: p.stock_quantity <= 0,
                  }))}
                />
              </div>
              <Button
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => addProductToCart(selectedProduct)}
                disabled={!selectedProduct}
              >
                Add
              </Button>
            </div>

            {/* Quick Add Grid */}
            <div className="mt-6">
              <h3 className="mb-3 text-ui font-medium text-text-secondary">Quick add</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                {filteredProducts.slice(0, 12).map(product => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProductToCart(product.id.toString())}
                    disabled={product.stock_quantity <= 0}
                    // The visible text is a truncated name, so on a narrow
                    // tile a screen reader heard "Marigold Accent..." and
                    // nothing about what pressing it does.
                    aria-label={`Add ${product.name} to the sale`}
                    className={cn(
                      'rounded-md border border-border-subtle bg-surface p-3 text-center',
                      'transition-colors duration-fast ease-standard hover:border-border-strong hover:bg-surface-subtle',
                      'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border-subtle disabled:hover:bg-surface'
                    )}
                  >
                    {/* The photograph, not a generic box.
                        A cashier finding a sofa among twelve tiles recognises
                        it far faster by sight than by reading a name that has
                        been truncated to fit. The tile keeps its size; the
                        icon only stands in when a product has no image. */}
                    <span className="relative mb-2 block aspect-[4/3] overflow-hidden rounded-sm bg-surface-subtle">
                      {product.primary_image || product.images?.[0]?.image_url ? (
                        <Image
                          src={product.primary_image || product.images![0].image_url}
                          alt=""
                          fill
                          sizes="160px"
                          className="object-cover"
                        />
                      ) : (
                        <Package
                          className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 text-text-tertiary"
                          aria-hidden="true"
                        />
                      )}
                    </span>
                    <span className="block truncate text-caption font-medium text-text-primary">
                      {product.name}
                    </span>
                    <Money amount={product.price} className="block text-caption" />
                    <span className="block text-caption text-text-tertiary">
                      {product.stock_quantity} in stock
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Cart & Totals */}
          <div className="space-y-6">
            <Card>
              <h2 className="mb-4 text-h2 text-text-primary">Cart</h2>

              {cart.length === 0 ? (
                <p className="py-8 text-center text-body text-text-tertiary">Nothing in the sale yet</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {cart.map(item => (
                    <div
                      key={item.product_id}
                      className="flex items-center gap-3 rounded-md bg-surface-subtle p-3"
                    >
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-surface">
                        <Image
                          src={item.product_image || '/placeholder.png'}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-ui font-medium text-text-primary">
                          {item.product_name}
                        </p>
                        <p className="font-mono text-caption text-text-tertiary">
                          {item.product_sku}
                        </p>
                      </div>
                      {/* These three carried no accessible name at all -- an
                          icon with no label, on the only controls that change
                          what the customer is charged. */}
                      <div className="flex items-center gap-1">
                        <IconButton
                          label={`Reduce ${item.product_name}`}
                          size="sm"
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        >
                          <Minus />
                        </IconButton>
                        <span className="w-8 text-center text-ui tabular-nums">{item.quantity}</span>
                        <IconButton
                          label={`Add another ${item.product_name}`}
                          size="sm"
                          disabled={item.quantity >= item.stock_quantity}
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        >
                          <Plus />
                        </IconButton>
                      </div>
                      <Money amount={item.subtotal} className="text-ui font-medium" />
                      <IconButton
                        label={`Remove ${item.product_name} from the sale`}
                        size="sm"
                        onClick={() => removeFromCart(item.product_id)}
                        className="text-text-secondary hover:text-danger-700"
                      >
                        <Trash2 />
                      </IconButton>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Totals */}
            <Card>
              <h2 className="mb-4 text-h2 text-text-primary">Summary</h2>
              <dl className="space-y-2">
                <div className="flex justify-between text-body">
                  <dt className="text-text-secondary">Subtotal</dt>
                  <dd>
                    <Money amount={subtotal} className="font-medium" />
                  </dd>
                </div>
                <div className="flex justify-between text-body">
                  <dt className="text-text-secondary">Tax (18%)</dt>
                  <dd>
                    <Money amount={tax} className="font-medium" />
                  </dd>
                </div>
                <div className="flex justify-between border-t border-border-subtle pt-2">
                  <dt className="text-h3 text-text-primary">Total</dt>
                  <dd>
                    {/* Neutral, like every other total in the system. Colouring
                        it spent the accent on information. */}
                    <Money amount={total} className="text-h3 text-text-primary" />
                  </dd>
                </div>
              </dl>

              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  onClick={clearCart}
                  disabled={cart.length === 0}
                  fullWidth
                >
                  Clear
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<Receipt className="h-4 w-4" />}
                  onClick={() => setPaymentModal(true)}
                  disabled={cart.length === 0}
                  fullWidth
                >
                  Take payment
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </Container>

      {/* Payment Modal */}
      <Modal
        isOpen={paymentModal}
        onClose={() => setPaymentModal(false)}
        title={mode === 'booking' ? 'Take a booking' : 'Take payment'}
        size="md"
      >
        <div className="space-y-4">
          {/* Which kind of sale this is. First, because it changes what the
              rest of the dialog asks for. */}
          <div
            role="radiogroup"
            aria-label="Kind of sale"
            className="grid grid-cols-2 gap-1 rounded-sm border border-border-subtle bg-surface-subtle p-1 shadow-well"
          >
            {([
              ['sale', 'Paying now', 'Goods leave today'],
              ['booking', 'Booking', 'Advance now, collect later'],
            ] as const).map(([value, label, hint]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={mode === value}
                onClick={() => {
                  setMode(value)
                  if (value === 'booking' && !deliveryDate) setDeliveryDate(defaultDeliveryDate())
                }}
                className={cn(
                  'rounded-xs px-3 py-2 text-left transition-colors duration-fast ease-standard',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  mode === value
                    ? 'bg-surface text-text-primary shadow-e1'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                <span className="block text-ui font-medium">{label}</span>
                <span className="block text-caption text-text-tertiary">{hint}</span>
              </button>
            ))}
          </div>

          {/* Who this is for.
              Optional by design -- a walk-in who does not want to leave a
              number should not be held up at the counter -- but the phone is
              asked for first, because it is what turns a stranger into a
              returning customer with a history. */}
          <div className="rounded-md border border-border-subtle bg-surface-subtle p-4">
            <div className="mb-3 flex items-center gap-2">
              <UserRound className="h-4 w-4 text-text-secondary" aria-hidden="true" />
              <p className="text-ui font-medium text-text-primary">Customer</p>
              {/* Optional for a sale that finishes now; required for one that
                  does not, because somebody has to be handed the furniture. */}
              <span className="text-caption text-text-tertiary">
                {mode === 'booking' ? 'required' : 'optional'}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Phone"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="0300 1234567"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                helperText={
                  knownCustomer
                    ? `Returning customer — ${knownCustomer.name}`
                    : 'We will look them up as you type'
                }
              />
              <Input
                label="Name"
                autoComplete="off"
                placeholder="Bilal Ahmed"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
              />
            </div>

            {/* Full width, and last. The phone is what identifies somebody at
                a counter; an email is where the written copy goes, so it is
                worth having and never worth holding up a queue for.

                The helper text names what the email will contain rather than
                saying "optional" again -- a cashier who knows the customer
                gets the balance and the date in writing has a reason to ask
                for the address, and asking is the whole point of the field. */}
            <Input
              className="mt-3"
              label="Email"
              type="email"
              autoComplete="off"
              placeholder="bilal@example.com"
              value={customerEmail}
              onChange={e => setCustomerEmail(e.target.value)}
              error={emailError}
              helperText={
                mode === 'booking'
                  ? 'We email the delivery date, the advance and the balance to this address'
                  : 'We email a copy of the receipt to this address'
              }
            />
          </div>

          <Select
            label="Payment method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'card', label: 'Card' },
              { value: 'upi', label: 'UPI' },
              { value: 'bank_transfer', label: 'Bank Transfer' },
            ]}
          />

          {mode === 'booking' && (
            <Input
              label="Delivery date"
              type="date"
              value={deliveryDate}
              min={earliestDeliveryDate()}
              onChange={e => setDeliveryDate(e.target.value)}
              helperText="The day the customer comes to collect"
            />
          )}

          {/* The currency affix used to be a DollarSign icon, on a shop that
              prices everything in rupees. */}
          <Input
            label={mode === 'booking' ? 'Advance taken' : 'Amount paid'}
            type="number"
            step="1"
            inputMode="numeric"
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            placeholder={String(Math.round(mode === 'booking' ? total / 2 : total))}
            leftIcon={<span className="text-ui text-text-tertiary">Rs</span>}
          />

          {mode === 'sale' && amountPaid && parseFloat(amountPaid) >= total && (
            <div className="rounded-md bg-success-50 p-3">
              <p className="text-ui text-success-900">
                Change due: <Money amount={changeAmount} className="font-medium" />
              </p>
            </div>
          )}

          {/* The number the customer will ask about, so it is stated before
              the booking is taken rather than discovered on the printed bill. */}
          {mode === 'booking' && (
            <div className="rounded-md border border-border-subtle bg-surface-subtle p-3">
              <p className="text-ui text-text-secondary">Balance due on collection</p>
              <Money amount={balanceDue} className="text-h2 text-text-primary" />
            </div>
          )}

          <div className="rounded-md bg-surface-subtle p-3">
            <p className="text-ui text-text-secondary">
              {mode === 'booking' ? 'Order total' : 'Total due'}
            </p>
            <Money amount={total} className="text-h1 text-text-primary" />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setPaymentModal(false)} fullWidth>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={mode === 'booking' ? processBooking : processBilling}
              disabled={cart.length === 0}
              fullWidth
            >
              {mode === 'booking' ? 'Take booking' : 'Complete sale'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Print Receipt Modal */}
      {showReceipt && currentReceipt && (
        <PrintReceipt
          receipt={currentReceipt}
          onClose={() => {
            setShowReceipt(false)
            setCurrentReceipt(null)
          }}
        />
      )}

      {showBooking && currentBooking && (
        <PrintBookingBill
          booking={currentBooking}
          onClose={() => {
            setShowBooking(false)
            setCurrentBooking(null)
          }}
        />
      )}
    </div>
  )
}