'use client'

import { formatCurrency, formatDate } from '@/lib/utils'
import PrintDocument from './PrintDocument'
import type { CustomerSummary, Purchase } from '@/lib/customers'

interface PrintStatementProps {
  customer: CustomerSummary
  purchases: Purchase[]
  onClose: () => void
}

/**
 * Everything one customer has ever bought, on paper.
 *
 * A shop gets asked for this: for a warranty claim, for an insurance list
 * after a move, or simply because somebody wants to know what they bought
 * three years ago. It is a statement rather than a stack of receipts, so it
 * leads with the totals and lists each purchase underneath with its lines
 * intact.
 */
export default function PrintStatement({ customer, purchases, onClose }: PrintStatementProps) {
  return (
    <PrintDocument title={`Statement — ${customer.name}`} onClose={onClose}>
      <header className="flex items-start justify-between gap-6 border-b border-border-strong pb-5">
        <div>
          <p className="font-serif text-h1 text-text-primary">VEMCO</p>
          <p className="mt-1 text-caption text-text-secondary">
            Showroom 14, Gulberg III, Lahore · +92 42 3500 0000
          </p>
        </div>
        <div className="text-right">
          <p className="text-h3 text-text-primary">Purchase statement</p>
          <p className="mt-1 text-caption text-text-secondary">
            Issued {formatDate(new Date().toISOString())}
          </p>
        </div>
      </header>

      <section className="mt-5 flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-caption uppercase tracking-[0.06em] text-text-secondary">Customer</p>
          <p className="mt-1 text-h3 text-text-primary">{customer.name}</p>
          <p className="font-mono text-ui text-text-secondary">{customer.phone}</p>
          {customer.email && <p className="text-ui text-text-secondary">{customer.email}</p>}
          {customer.address && (
            <p className="mt-1 max-w-[70mm] text-ui text-text-secondary">{customer.address}</p>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-ui">
          <dt className="text-text-secondary">Purchases</dt>
          <dd className="text-right tabular-nums text-text-primary">{purchases.length}</dd>
          <dt className="text-text-secondary">Customer since</dt>
          <dd className="text-right text-text-primary">{formatDate(customer.created_at)}</dd>
          <dt className="text-h3 text-text-primary">Total spent</dt>
          <dd className="text-right text-h3 tabular-nums text-text-primary">
            {formatCurrency(customer.total_spent)}
          </dd>
        </dl>
      </section>

      {purchases.length === 0 ? (
        <p className="mt-8 text-body text-text-secondary">No purchases recorded.</p>
      ) : (
        <div className="mt-6 space-y-5">
          {purchases.map(purchase => (
            <section
              key={`${purchase.source}-${purchase.reference}`}
              data-print-keep
              className="border-t border-border-subtle pt-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-ui text-text-primary">
                  <span className="font-mono font-medium">{purchase.reference}</span>
                  <span className="text-text-secondary">
                    {' · '}
                    {purchase.source === 'counter' ? 'In store' : 'Online'}
                  </span>
                </p>
                <p className="text-ui text-text-secondary">{formatDate(purchase.date)}</p>
              </div>

              <table className="mt-2 w-full border-collapse text-ui">
                <tbody>
                  {purchase.items.map((item, index) => (
                    <tr key={index}>
                      <td className="py-1 pr-3 text-text-primary">{item.product_name}</td>
                      <td className="w-16 py-1 text-right tabular-nums text-text-secondary">
                        ×{item.quantity}
                      </td>
                      <td className="w-28 py-1 text-right tabular-nums text-text-primary">
                        {formatCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={2} className="pt-1.5 text-right text-text-secondary">
                      Paid
                    </td>
                    <td className="pt-1.5 text-right font-medium tabular-nums text-text-primary">
                      {formatCurrency(purchase.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}

      <footer className="mt-8 border-t border-border-strong pt-4 text-caption text-text-secondary">
        <p>
          This statement is a record of purchases, not a tax invoice. Structural guarantee
          of five years applies from each purchase date on solid wood frames.
        </p>
      </footer>
    </PrintDocument>
  )
}
