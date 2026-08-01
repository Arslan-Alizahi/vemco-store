'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Phone, Search, Users } from 'lucide-react'
import Container from '@/components/layout/Container'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Money from '@/components/ui/Money'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import { formatDate } from '@/lib/utils'
import type { CustomerSummary } from '@/lib/customers'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  const load = useCallback((term: string) => {
    setStatus(current => (current === 'ready' ? 'ready' : 'loading'))

    fetch(`/api/customers${term ? `?search=${encodeURIComponent(term)}` : ''}`)
      .then(res => {
        if (!res.ok) throw new Error('Request failed')
        return res.json()
      })
      .then(data => {
        if (!data.success) throw new Error(data.message)
        setCustomers(data.data)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  // Debounced, so typing a name does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => load(search), 250)
    return () => clearTimeout(timer)
  }, [search, load])

  const totalSpend = customers.reduce((sum, customer) => sum + customer.total_spent, 0)

  return (
    <Container size="wide" className="py-section-sm">
      <PageHeader
        eyebrow="People"
        title="Customers"
        lead="Everyone who has left a phone number at the counter or ordered online."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="shadow-e1">
          <p className="text-ui text-text-secondary">Customers</p>
          <p className="mt-1 text-h1 tabular-nums text-text-primary">{customers.length}</p>
        </Card>
        <Card className="shadow-e1">
          <p className="text-ui text-text-secondary">Lifetime value</p>
          <Money amount={totalSpend} className="mt-1 block text-h1 text-text-primary" />
        </Card>
        <Card className="shadow-e1">
          <p className="text-ui text-text-secondary">Returning</p>
          <p className="mt-1 text-h1 tabular-nums text-text-primary">
            {customers.filter(customer => customer.purchase_count > 1).length}
          </p>
        </Card>
      </div>

      <Card className="mb-6">
        <Input
          label="Search"
          placeholder="Name, phone or email"
          value={search}
          onChange={event => setSearch(event.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
      </Card>

      {status === 'loading' ? (
        <div className="flex justify-center py-section-sm">
          <Spinner size="lg" />
        </div>
      ) : status === 'error' ? (
        <ErrorState
          title="We could not load the customers"
          onRetry={() => load(search)}
        />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? 'Nobody matches that' : 'No customers yet'}
          description={
            search
              ? 'Try a different name or number.'
              : 'Take a phone number at the till and the customer will appear here, with everything they buy from then on.'
          }
        />
      ) : (
        <Card noPadding>
          {/* relative, so an absolutely positioned descendant is contained.
              Tailwind's sr-only is position:absolute, and with a static
              scroll container its containing block became the viewport --
              so the hidden "Open" label in the last header cell sat at the
              table's full 595px width and scrolled the whole page sideways
              at 320px. Nothing was visible; the page just moved. */}
          <div
            className="relative overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Customers, scrolls sideways"
          >
            <table className="w-full text-ui">
              <thead>
                <tr className="border-b border-border-subtle text-caption uppercase tracking-[0.06em] text-text-secondary">
                  <th scope="col" className="px-4 py-3 text-left font-medium">Customer</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Phone</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Purchases</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Spent</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Last seen</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {customers.map(customer => (
                  <tr
                    key={customer.id}
                    className="border-b border-border-subtle transition-colors duration-fast last:border-0 hover:bg-surface-subtle"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        className="font-medium text-text-primary hover:underline"
                      >
                        {customer.name}
                      </Link>
                      {customer.purchase_count > 1 && (
                        <Badge variant="default" size="sm" className="ml-2 align-middle">
                          Returning
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`tel:${customer.phone}`}
                        className="inline-flex items-center gap-1.5 font-mono text-text-secondary hover:text-text-primary"
                      >
                        <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                        {customer.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-primary">
                      {customer.purchase_count}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Money amount={customer.total_spent} className="font-medium" />
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {customer.last_purchase_at ? formatDate(customer.last_purchase_at) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        aria-label={`Open ${customer.name}`}
                        className="inline-flex rounded-sm p-1 text-text-tertiary transition-colors duration-fast hover:text-text-primary"
                      >
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Container>
  )
}
