'use client'

import { MessageCircle } from 'lucide-react'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { bookingWhatsappLink } from '@/lib/whatsapp'
import type { BookingDetail } from '@/lib/bookings'
import PrintDocument from './PrintDocument'
import PrintLetterhead from './PrintLetterhead'
import { PoweredByPrint } from '@/components/layout/PoweredBy'
import Button from './Button'

/**
 * The slip a customer takes away and brings back on collection day.
 *
 * A till receipt records a finished transaction; this records an unfinished
 * one, so it is built around the three facts the customer will actually be
 * checking weeks later: what they have paid, what is still owed, and the day
 * the furniture arrives. Those are stated twice — once in the summary and
 * once in a band the eye lands on first — because a bill that hides the
 * balance in a column of figures is the bill that starts the argument.
 */
export function PrintBookingBill({
  booking,
  onClose,
}: {
  booking: BookingDetail
  onClose: () => void
}) {
  const outstanding = booking.balance > 0.01
  const whatsapp = bookingWhatsappLink(booking)

  return (
    <PrintDocument
      title="Booking bill"
      onClose={onClose}
      actions={
        // Hidden rather than disabled when there is no usable number: a
        // WhatsApp button that opens an empty chat looks like the shop lost
        // the customer's details.
        whatsapp ? (
          <Button
            size="sm"
            variant="outline"
            leftIcon={<MessageCircle className="h-4 w-4" />}
            onClick={() => window.open(whatsapp, '_blank', 'noopener,noreferrer')}
          >
            Send on WhatsApp
          </Button>
        ) : null
      }
    >
      <PrintLetterhead />

      <p className="mt-5 text-center text-overline uppercase tracking-wide text-text-secondary">
        {booking.status === 'cancelled'
          ? 'Cancelled booking'
          : booking.status === 'delivered'
            ? 'Delivered — paid in full'
            : 'Order booking'}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-ui">
        <div className="flex justify-between">
          <dt className="text-text-secondary">Booking</dt>
          <dd className="font-mono text-text-primary">{booking.booking_number}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-secondary">Booked</dt>
          <dd className="text-text-primary">{formatDateTime(booking.created_at)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-secondary">Customer</dt>
          <dd className="text-text-primary">{booking.customer_name}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-secondary">Phone</dt>
          <dd className="font-mono text-text-primary">{booking.customer_phone}</dd>
        </div>
      </dl>

      {/* The band. What the customer came to check. */}
      <div
        data-print-keep
        className="mt-5 grid grid-cols-2 gap-4 rounded-md border border-border-strong p-4"
      >
        <div>
          <p className="text-caption uppercase tracking-wide text-text-secondary">
            {outstanding ? 'Balance due on collection' : 'Balance'}
          </p>
          <p className="mt-1 font-serif text-h1 text-text-primary">
            {outstanding ? formatCurrency(booking.balance) : 'Paid in full'}
          </p>
        </div>
        <div>
          <p className="text-caption uppercase tracking-wide text-text-secondary">
            {booking.status === 'delivered' ? 'Delivered on' : 'Delivery on'}
          </p>
          <p className="mt-1 font-serif text-h1 text-text-primary">
            {formatDate(booking.delivered_at ?? booking.delivery_date)}
          </p>
        </div>
      </div>

      <table className="mt-6 w-full text-ui">
        <thead>
          <tr className="border-b border-border-subtle text-caption uppercase tracking-wide text-text-secondary">
            <th className="py-2 text-left font-normal">Item</th>
            <th className="py-2 text-right font-normal">Qty</th>
            <th className="py-2 text-right font-normal">Price</th>
            <th className="py-2 text-right font-normal">Total</th>
          </tr>
        </thead>
        <tbody>
          {booking.items.map((item, index) => (
            <tr key={index} className="border-b border-border-subtle">
              <td className="py-2 text-text-primary">
                {item.product_name}
                {item.product_sku && (
                  <span className="block font-mono text-caption text-text-tertiary">
                    {item.product_sku}
                  </span>
                )}
              </td>
              <td className="py-2 text-right tabular-nums text-text-primary">{item.quantity}</td>
              <td className="py-2 text-right tabular-nums text-text-primary">
                {formatCurrency(item.unit_price)}
              </td>
              <td className="py-2 text-right tabular-nums text-text-primary">
                {formatCurrency(item.subtotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-5 ml-auto w-full max-w-xs space-y-1 text-ui">
        <div className="flex justify-between">
          <span className="text-text-secondary">Subtotal</span>
          <span className="tabular-nums text-text-primary">{formatCurrency(booking.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Tax</span>
          <span className="tabular-nums text-text-primary">{formatCurrency(booking.tax)}</span>
        </div>
        {booking.discount > 0 && (
          <div className="flex justify-between">
            <span className="text-text-secondary">Discount</span>
            <span className="tabular-nums text-text-primary">
              −{formatCurrency(booking.discount)}
            </span>
          </div>
        )}
        <div className="flex justify-between border-t border-border-strong pt-2">
          <span className="font-medium text-text-primary">Order total</span>
          <span className="font-medium tabular-nums text-text-primary">
            {formatCurrency(booking.total)}
          </span>
        </div>

        {/* Every instalment, dated. A customer who has paid three times
            should be able to see all three, not a single figure they have to
            take on trust. */}
        {booking.payments.map(payment => (
          <div key={payment.id} className="flex justify-between">
            <span className="text-text-secondary">
              {payment.notes || 'Payment'} · {formatDate(payment.paid_at)}
              <span className="text-text-tertiary"> ({payment.payment_method.replace(/_/g, ' ')})</span>
            </span>
            <span className="tabular-nums text-text-primary">−{formatCurrency(payment.amount)}</span>
          </div>
        ))}

        <div className="flex justify-between border-t border-border-strong pt-2">
          <span className="font-medium text-text-primary">
            {outstanding ? 'Balance due' : 'Balance'}
          </span>
          <span className="font-medium tabular-nums text-text-primary">
            {outstanding ? formatCurrency(booking.balance) : 'Nil'}
          </span>
        </div>
      </div>

      <footer className="mt-8 border-t border-border-subtle pt-5 text-center text-caption text-text-secondary">
        <p className="text-ui text-text-primary">Thank you.</p>
        <p className="mt-2">
          Please bring this bill on collection day. The balance is payable before the furniture
          leaves the showroom. Exchanges within 14 days, unused and in original packaging.
          Structural guarantee of five years on all solid wood frames.
        </p>
        <PoweredByPrint className="mt-4" />
      </footer>
    </PrintDocument>
  )
}

export default PrintBookingBill
