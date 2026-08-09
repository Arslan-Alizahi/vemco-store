'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarClock, MessageCircle, Search } from 'lucide-react'
import Container from '@/components/layout/Container'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import Money from '@/components/ui/Money'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { PrintBookingBill } from '@/components/ui/PrintBookingBill'
import { bookingWhatsappLink } from '@/lib/whatsapp'
import { formatDate } from '@/lib/utils'
import type { Booking, BookingDetail } from '@/lib/bookings'

export const dynamic = 'force-dynamic'

/** Today, as a date string, so a delivery date can be compared to it. */
const today = () => new Date().toISOString().slice(0, 10)

export default function BookingsPage() {
  const { addToast } = useToast()

  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [status, setStatus] = useState('booked')
  const [search, setSearch] = useState('')

  const [open, setOpen] = useState<BookingDetail | null>(null)
  const [bill, setBill] = useState<BookingDetail | null>(null)
  const [payment, setPayment] = useState('')
  const [method, setMethod] = useState('cash')
  const [confirm, setConfirm] = useState<null | { title: string; description: string; onConfirm: () => void }>(null)

  const load = useCallback(async () => {
    setFailed(false)
    try {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (search.trim()) params.set('search', search.trim())

      const res = await fetch(`/api/bookings?${params}`)
      const data = await res.json()

      if (!data.success) throw new Error(data.message)
      setBookings(data.data)
    } catch {
      setFailed(true)
    }
  }, [status, search])

  useEffect(() => {
    const timer = setTimeout(load, 250)
    return () => clearTimeout(timer)
  }, [load])

  const openBooking = async (id: number) => {
    const res = await fetch(`/api/bookings/${id}`)
    const data = await res.json()
    if (data.success) {
      setOpen(data.data)
      setPayment('')
    } else {
      addToast(data.message || 'We could not load that booking', 'error')
    }
  }

  const takePayment = async () => {
    if (!open) return

    const res = await fetch(`/api/bookings/${open.id}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(payment), payment_method: method }),
    })
    const data = await res.json()

    if (data.success) {
      addToast('Payment recorded', 'success')
      setOpen(data.data)
      setPayment('')
      load()
    } else {
      addToast(data.message || 'We could not record that payment', 'error')
    }
  }

  const act = async (action: 'deliver' | 'cancel') => {
    if (!open) return

    const res = await fetch(`/api/bookings/${open.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json()

    if (data.success) {
      addToast(action === 'deliver' ? 'Marked as delivered' : 'Booking cancelled', 'success')
      setOpen(data.data)
      load()
    } else {
      addToast(data.message || 'That did not work', 'error')
    }
  }

  const whatsapp = open ? bookingWhatsappLink(open) : null

  return (
    <Container className="py-section-md">
      <PageHeader
        eyebrow="Counter"
        title="Bookings"
        lead="Furniture ordered and paid for in part, waiting to be collected."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Input
          label="Search"
          placeholder="Name, phone or booking number"
          value={search}
          onChange={e => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
        <Select
          label="Show"
          value={status}
          onChange={e => setStatus(e.target.value)}
          options={[
            { value: 'booked', label: 'Awaiting collection' },
            { value: 'delivered', label: 'Delivered' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: '', label: 'Everything' },
          ]}
        />
      </div>

      {failed ? (
        <ErrorState title="We could not load the bookings" onRetry={load} />
      ) : bookings === null ? (
        <div className="flex justify-center py-section-md">
          <Spinner size="lg" />
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Nothing booked"
          description="Bookings taken at the counter appear here, with what is still owed and the day the furniture is due."
        />
      ) : (
        <ul className="space-y-3">
          {bookings.map(booking => {
            const overdue = booking.status === 'booked' && booking.delivery_date < today()

            return (
              <li key={booking.id}>
                <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="font-mono text-caption text-text-tertiary">
                      {booking.booking_number}
                    </p>
                    <p className="text-h3 text-text-primary">{booking.customer_name}</p>
                    <p className="text-ui text-text-secondary">{booking.customer_phone}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-caption uppercase tracking-wide text-text-secondary">
                      {booking.balance > 0.01 ? 'Balance' : 'Paid in full'}
                    </p>
                    {booking.balance > 0.01 ? (
                      <Money amount={booking.balance} className="text-h3 text-text-primary" />
                    ) : (
                      <Money amount={booking.total} className="text-h3 text-text-primary" />
                    )}
                  </div>

                  <div className="text-right">
                    {/* Overdue is the one thing on this page that has to be
                        noticed without being looked for. */}
                    <Badge variant={overdue ? 'danger' : booking.status === 'delivered' ? 'success' : 'secondary'}>
                      {overdue
                        ? `Overdue · ${formatDate(booking.delivery_date)}`
                        : booking.status === 'delivered'
                          ? 'Delivered'
                          : booking.status === 'cancelled'
                            ? 'Cancelled'
                            : `Due ${formatDate(booking.delivery_date)}`}
                    </Badge>
                  </div>

                  <Button variant="outline" size="sm" onClick={() => openBooking(booking.id)}>
                    Open
                  </Button>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <Modal
        isOpen={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open ? `Booking ${open.booking_number}` : ''}
        size="md"
      >
        {open && (
          <div className="space-y-4">
            <div>
              <p className="text-h3 text-text-primary">{open.customer_name}</p>
              <p className="text-ui text-text-secondary">{open.customer_phone}</p>
            </div>

            <ul className="space-y-1 text-ui">
              {open.items.map((item, index) => (
                <li key={index} className="flex justify-between">
                  <span className="text-text-secondary">
                    {item.quantity} × {item.product_name}
                  </span>
                  <Money amount={item.subtotal} className="text-text-primary" />
                </li>
              ))}
            </ul>

            <div className="space-y-1 rounded-md border border-border-subtle bg-surface-subtle p-4 text-ui">
              <div className="flex justify-between">
                <span className="text-text-secondary">Order total</span>
                <Money amount={open.total} className="text-text-primary" />
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Paid so far</span>
                <Money amount={open.paid} className="text-text-primary" />
              </div>
              <div className="flex justify-between border-t border-border-subtle pt-1">
                <span className="font-medium text-text-primary">Balance</span>
                <Money amount={open.balance} className="font-medium text-text-primary" />
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-text-secondary">
                  {open.status === 'delivered' ? 'Delivered' : 'Delivery'}
                </span>
                <span className="text-text-primary">
                  {formatDate(open.delivered_at ?? open.delivery_date)}
                </span>
              </div>
            </div>

            {open.status === 'booked' && open.balance > 0.01 && (
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                <Input
                  label="Record a payment"
                  type="number"
                  inputMode="numeric"
                  value={payment}
                  onChange={e => setPayment(e.target.value)}
                  placeholder={String(Math.round(open.balance))}
                  leftIcon={<span className="text-ui text-text-tertiary">Rs</span>}
                />
                <Select
                  label="Method"
                  value={method}
                  onChange={e => setMethod(e.target.value)}
                  options={[
                    { value: 'cash', label: 'Cash' },
                    { value: 'card', label: 'Card' },
                    { value: 'upi', label: 'UPI' },
                    { value: 'bank_transfer', label: 'Bank Transfer' },
                  ]}
                />
                <Button onClick={takePayment} disabled={!Number(payment)}>
                  Record
                </Button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setBill(open)}>
                Bill
              </Button>

              {whatsapp && (
                <Button
                  variant="outline"
                  leftIcon={<MessageCircle className="h-4 w-4" />}
                  onClick={() => window.open(whatsapp, '_blank', 'noopener,noreferrer')}
                >
                  WhatsApp
                </Button>
              )}

              {open.status === 'booked' && (
                <>
                  <Button
                    onClick={() =>
                      setConfirm({
                        title: 'Hand this booking over?',
                        description: `${open.booking_number} will be marked delivered. The balance must already be settled.`,
                        onConfirm: () => act('deliver'),
                      })
                    }
                    disabled={open.balance > 0.01}
                  >
                    Mark delivered
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setConfirm({
                        title: 'Cancel this booking?',
                        description:
                          'The pieces go back into stock. Any money already taken stays on the books — refunding it is a decision for the counter.',
                        onConfirm: () => act('cancel'),
                      })
                    }
                  >
                    Cancel booking
                  </Button>
                </>
              )}
            </div>

            {open.status === 'booked' && open.balance > 0.01 && (
              <p className="text-caption text-text-tertiary">
                The balance has to be recorded before the furniture can be marked delivered.
              </p>
            )}
          </div>
        )}
      </Modal>

      {bill && <PrintBookingBill booking={bill} onClose={() => setBill(null)} />}

      {confirm && (
        <ConfirmDialog
          isOpen
          title={confirm.title}
          description={confirm.description}
          onConfirm={() => {
            confirm.onConfirm()
            setConfirm(null)
          }}
          onClose={() => setConfirm(null)}
        />
      )}
    </Container>
  )
}
