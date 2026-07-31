'use client'

import { formatCurrency, formatDateTime } from '@/lib/utils'
import PrintDocument from './PrintDocument'

interface ReceiptItem {
  product_name: string
  product_sku: string
  quantity: number
  unit_price: number
  subtotal: number
}

interface Receipt {
  id: number
  receipt_number: string
  customer_name?: string | null
  customer_phone?: string | null
  items: ReceiptItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  amount_paid: number
  change_amount: number
  payment_method: string
  created_at: string
}

interface PrintReceiptProps {
  receipt: Receipt
  onClose: () => void
}

/**
 * A till receipt, laid out as a document rather than a dialog.
 *
 * The previous version printed nothing at all: the print stylesheet hid the
 * page with selectors that assumed a particular DOM shape, and once the till
 * gained a shell the receipt fell outside them. What came out of the printer
 * was the POS header on an otherwise blank sheet. PrintDocument renders into
 * a container attached to <body>, so the print rule has one job and no
 * layout above can break it.
 */
export function PrintReceipt({ receipt, onClose }: PrintReceiptProps) {
  const paymentLabel = receipt.payment_method.replace(/_/g, ' ')

  return (
    <PrintDocument title="Receipt" onClose={onClose}>
      <header className="border-b border-border-strong pb-5 text-center">
        <p className="font-serif text-h1 text-text-primary">VEMCO</p>
        <p className="mt-1 text-ui text-text-secondary">Furniture for considered spaces</p>
        <p className="mt-2 text-caption text-text-secondary">
          Showroom 14, Gulberg III, Lahore · +92 42 3500 0000 · hello@vemco.pk
        </p>
      </header>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-ui">
        <div className="flex justify-between">
          <dt className="text-text-secondary">Receipt</dt>
          <dd className="font-mono font-medium text-text-primary">{receipt.receipt_number}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-secondary">Date</dt>
          <dd className="text-text-primary">{formatDateTime(receipt.created_at)}</dd>
        </div>

        {/* Only when there is one. An empty "Customer: —" row on a walk-in
            receipt is noise on a piece of paper that has none to spare. */}
        {receipt.customer_name && (
          <div className="flex justify-between">
            <dt className="text-text-secondary">Customer</dt>
            <dd className="text-text-primary">{receipt.customer_name}</dd>
          </div>
        )}
        {receipt.customer_phone && (
          <div className="flex justify-between">
            <dt className="text-text-secondary">Phone</dt>
            <dd className="font-mono text-text-primary">{receipt.customer_phone}</dd>
          </div>
        )}
      </dl>

      <table className="mt-6 w-full border-collapse text-ui">
        <thead>
          <tr className="border-y border-border-strong text-caption uppercase tracking-[0.06em] text-text-secondary">
            <th scope="col" className="py-2 text-left font-medium">Item</th>
            <th scope="col" className="py-2 text-right font-medium">Qty</th>
            <th scope="col" className="py-2 text-right font-medium">Price</th>
            <th scope="col" className="py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {receipt.items.map((item, index) => (
            <tr key={index} className="border-b border-border-subtle align-top">
              <td className="py-2.5 pr-3">
                <span className="block text-text-primary">{item.product_name}</span>
                {item.product_sku && (
                  <span className="block font-mono text-caption text-text-secondary">
                    {item.product_sku}
                  </span>
                )}
              </td>
              <td className="py-2.5 text-right tabular-nums text-text-primary">{item.quantity}</td>
              <td className="py-2.5 text-right tabular-nums text-text-primary">
                {formatCurrency(item.unit_price)}
              </td>
              <td className="py-2.5 text-right font-medium tabular-nums text-text-primary">
                {formatCurrency(item.subtotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Kept together, so a page break never lands between the total and
          what was handed over. */}
      <div data-print-keep className="ml-auto mt-5 w-full max-w-[62mm] text-ui">
        <dl className="space-y-1.5">
          <div className="flex justify-between">
            <dt className="text-text-secondary">Subtotal</dt>
            <dd className="tabular-nums text-text-primary">{formatCurrency(receipt.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-secondary">Tax</dt>
            <dd className="tabular-nums text-text-primary">{formatCurrency(receipt.tax)}</dd>
          </div>
          {receipt.discount > 0 && (
            <div className="flex justify-between text-sage-700">
              <dt>Discount</dt>
              <dd className="tabular-nums">-{formatCurrency(receipt.discount)}</dd>
            </div>
          )}

          <div className="flex justify-between border-t border-border-strong pt-2 text-h3 text-text-primary">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatCurrency(receipt.total)}</dd>
          </div>

          <div className="flex justify-between pt-1 capitalize">
            <dt className="text-text-secondary">Paid ({paymentLabel})</dt>
            <dd className="tabular-nums text-text-primary">
              {formatCurrency(receipt.amount_paid)}
            </dd>
          </div>
          {receipt.change_amount > 0 && (
            <div className="flex justify-between">
              <dt className="text-text-secondary">Change</dt>
              <dd className="tabular-nums text-text-primary">
                {formatCurrency(receipt.change_amount)}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <footer className="mt-8 border-t border-border-subtle pt-5 text-center text-caption text-text-secondary">
        <p className="text-ui text-text-primary">Thank you.</p>
        <p className="mt-2">
          Exchanges within 14 days with this receipt, unused and in original packaging.
          Structural guarantee of five years on all solid wood frames.
        </p>
      </footer>
    </PrintDocument>
  )
}

export default PrintReceipt
