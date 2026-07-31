'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Mail, MapPin, Phone, Printer, ShoppingBag, Store } from 'lucide-react'
import Container from '@/components/layout/Container'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Money from '@/components/ui/Money'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import PrintStatement from '@/components/ui/PrintStatement'
import { formatDate, formatDateTime } from '@/lib/utils'
import type { CustomerSummary, Purchase } from '@/lib/customers'

export default function CustomerDetailPage() {
  const params = useParams()
  const [customer, setCustomer] = useState<CustomerSummary | null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [statementOpen, setStatementOpen] = useState(false)

  const load = useCallback(() => {
    setStatus('loading')
    fetch(`/api/customers/${params.id}`)
      .then(res => {
        if (!res.ok) throw new Error('Request failed')
        return res.json()
      })
      .then(data => {
        if (!data.success) throw new Error(data.message)
        setCustomer(data.data.customer)
        setPurchases(data.data.purchases)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [params.id])

  useEffect(load, [load])

  if (status === 'loading') {
    return (
      <Container className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </Container>
    )
  }

  if (status === 'error' || !customer) {
    return (
      <Container size="prose" className="py-section-sm">
        <ErrorState title="We could not load that customer" onRetry={load} />
      </Container>
    )
  }

  const averageOrder = purchases.length > 0 ? customer.total_spent / purchases.length : 0

  return (
    <Container size="wide" className="py-section-sm">
      {statementOpen && (
        <PrintStatement
          customer={customer}
          purchases={purchases}
          onClose={() => setStatementOpen(false)}
        />
      )}

      <Link
        href="/admin/customers"
        className="mb-5 inline-flex items-center gap-2 text-ui text-text-secondary transition-colors duration-fast hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All customers
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-h1 text-text-primary">{customer.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-ui text-text-secondary">
            <a href={`tel:${customer.phone}`} className="inline-flex items-center gap-1.5 font-mono hover:text-text-primary">
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              {customer.phone}
            </a>
            {customer.email && (
              <a href={`mailto:${customer.email}`} className="inline-flex items-center gap-1.5 hover:text-text-primary">
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                {customer.email}
              </a>
            )}
            {customer.address && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {customer.address}
              </span>
            )}
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => setStatementOpen(true)}
          disabled={purchases.length === 0}
          leftIcon={<Printer className="h-4 w-4" />}
        >
          Print statement
        </Button>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-e1">
          <p className="text-ui text-text-secondary">Total spent</p>
          <Money amount={customer.total_spent} className="mt-1 block text-h1 text-text-primary" />
        </Card>
        <Card className="shadow-e1">
          <p className="text-ui text-text-secondary">Purchases</p>
          <p className="mt-1 text-h1 tabular-nums text-text-primary">{purchases.length}</p>
        </Card>
        <Card className="shadow-e1">
          <p className="text-ui text-text-secondary">Average purchase</p>
          <Money amount={averageOrder} className="mt-1 block text-h1 text-text-primary" />
        </Card>
        <Card className="shadow-e1">
          <p className="text-ui text-text-secondary">Customer since</p>
          <p className="mt-1 text-h3 text-text-primary">{formatDate(customer.created_at)}</p>
        </Card>
      </div>

      <h2 className="mb-4 text-h2 text-text-primary">Purchase history</h2>

      {purchases.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Nothing bought yet"
          description="Anything this customer buys, at the counter or online, will appear here."
        />
      ) : (
        <div className="space-y-4">
          {purchases.map(purchase => (
            <Card key={`${purchase.source}-${purchase.reference}`} noPadding>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle p-4">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Where it was bought, said plainly. A counter sale and a
                      website order are different conversations later. */}
                  <Badge variant={purchase.source === 'counter' ? 'default' : 'sale'} size="sm">
                    {purchase.source === 'counter' ? (
                      <span className="inline-flex items-center gap-1">
                        <Store className="h-3 w-3" aria-hidden="true" /> In store
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <ShoppingBag className="h-3 w-3" aria-hidden="true" /> Online
                      </span>
                    )}
                  </Badge>
                  <span className="font-mono text-ui text-text-primary">{purchase.reference}</span>
                  <span className="text-ui text-text-secondary">
                    {formatDateTime(purchase.date)}
                  </span>
                </div>
                <Money amount={purchase.total} className="text-h3 text-text-primary" />
              </div>

              <ul className="divide-y divide-border-subtle">
                {purchase.items.map((item, index) => (
                  <li key={index} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-ui text-text-primary">{item.product_name}</p>
                      {item.product_sku && (
                        <p className="font-mono text-caption text-text-secondary">
                          {item.product_sku}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-6 text-ui">
                      <span className="tabular-nums text-text-secondary">×{item.quantity}</span>
                      <Money amount={item.subtotal} className="w-28 text-right" />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </Container>
  )
}
