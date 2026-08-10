'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarClock, MessageCircle, Phone, Search } from 'lucide-react'
import Container from '@/components/layout/Container'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import Money from '@/components/ui/Money'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { formatDate, formatDateTime } from '@/lib/utils'
import { toInternationalPhone } from '@/lib/phone'
import { telHref } from '@/lib/brand'
import type { EnquiryDetail, EnquiryStatus } from '@/lib/enquiries'

export const dynamic = 'force-dynamic'

const INTENT_LABEL: Record<string, string> = {
  visit: 'Showroom visit',
  reserve: 'Reserve a piece',
  delivery: 'Buy and deliver',
}

/**
 * The shop's list of people waiting for a call.
 *
 * Sorted newest first and defaulting to the ones nobody has rung yet,
 * because that is the only question this page is ever opened to answer.
 * Every row carries a tappable number: the point of the page is to shorten
 * the distance between a lead arriving and somebody dialling it, and a
 * number you have to copy is a number that waits until tomorrow.
 */
export default function EnquiriesPage() {
  const { addToast } = useToast()

  const [enquiries, setEnquiries] = useState<EnquiryDetail[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [status, setStatus] = useState('new')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState<number | null>(null)

  const load = useCallback(async () => {
    setFailed(false)
    try {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (search.trim()) params.set('search', search.trim())

      const res = await fetch(`/api/enquiries?${params}`)
      const data = await res.json()

      if (!data.success) throw new Error(data.message)
      setEnquiries(data.data)
    } catch {
      setFailed(true)
    }
  }, [status, search])

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [load, search])

  const mark = async (id: number, next: EnquiryStatus) => {
    setSaving(id)
    try {
      const res = await fetch(`/api/enquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      addToast(next === 'contacted' ? 'Marked as contacted' : 'Closed', 'success')
      load()
    } catch {
      addToast('We could not update that enquiry', 'error')
    } finally {
      setSaving(null)
    }
  }

  return (
    <Container className="py-section-md">
      <PageHeader
        eyebrow="Counter"
        title="Enquiries"
        lead="People who asked to be called about a piece. Nothing here is paid for or held."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <Input
          label="Search"
          placeholder="Name, phone or reference"
          value={search}
          onChange={event => setSearch(event.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
        <Select
          label="Show"
          value={status}
          onChange={event => setStatus(event.target.value)}
          options={[
            { value: 'new', label: 'Waiting for a call' },
            { value: 'contacted', label: 'Contacted' },
            { value: 'closed', label: 'Closed' },
            { value: '', label: 'Everything' },
          ]}
        />
      </div>

      {failed ? (
        <ErrorState
          title="We could not load the enquiries"
          description="This usually clears on a second try."
          onRetry={load}
        />
      ) : enquiries === null ? (
        <div className="flex justify-center py-section-md">
          <Spinner />
        </div>
      ) : enquiries.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title={status === 'new' ? 'Nobody is waiting' : 'Nothing here'}
          description={
            status === 'new'
              ? 'Every enquiry has been answered. New ones arrive here and by email.'
              : 'Try a different filter.'
          }
        />
      ) : (
        <ul className="space-y-4">
          {enquiries.map(enquiry => (
            <li key={enquiry.id}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-caption text-text-tertiary">
                        {enquiry.reference}
                      </span>
                      <Badge variant={enquiry.status === 'new' ? 'warning' : 'secondary'}>
                        {INTENT_LABEL[enquiry.intent] ?? enquiry.intent}
                      </Badge>
                    </div>

                    <p className="mt-1 text-h3 text-text-primary">{enquiry.customer_name}</p>

                    {/* The number, tappable, directly under the name. This is
                        the whole job of the row. */}
                    <a
                      href={telHref(enquiry.customer_phone)}
                      className="mt-1 inline-flex items-center gap-2 rounded-sm font-mono text-body text-text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Phone className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
                      {enquiry.customer_phone}
                    </a>

                    <p className="mt-1 text-caption text-text-tertiary">
                      {formatDateTime(enquiry.created_at)}
                      {enquiry.city ? ` · ${enquiry.city}` : ''}
                      {enquiry.customer_email ? ` · ${enquiry.customer_email}` : ''}
                    </p>

                    {enquiry.visit_date && (
                      <p className="mt-2 inline-flex items-center gap-2 text-ui text-text-secondary">
                        <CalendarClock className="h-4 w-4" aria-hidden="true" />
                        Wants to visit on {formatDate(enquiry.visit_date)}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-eyebrow uppercase text-text-tertiary">Listed at</p>
                    <Money amount={enquiry.items_total} className="text-h3 text-text-primary" />
                  </div>
                </div>

                <ul className="mt-4 space-y-1 border-t border-border-subtle pt-4 text-ui">
                  {enquiry.items.map((item, index) => (
                    <li key={index} className="flex justify-between gap-4">
                      <span className="text-text-secondary">
                        {item.product_name}
                        {item.quantity > 1 && ` ×${item.quantity}`}
                      </span>
                      <Money amount={item.subtotal} className="text-text-primary" />
                    </li>
                  ))}
                </ul>

                {enquiry.message && (
                  <p className="mt-4 rounded-sm bg-surface-subtle p-3 text-ui text-text-primary">
                    {enquiry.message}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button asChild size="sm" leftIcon={<Phone className="h-4 w-4" />}>
                    <a href={telHref(enquiry.customer_phone)}>Call</a>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    leftIcon={<MessageCircle className="h-4 w-4" />}
                  >
                    <a
                      href={`https://wa.me/${toInternationalPhone(enquiry.customer_phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      WhatsApp
                    </a>
                  </Button>

                  {enquiry.status === 'new' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      isLoading={saving === enquiry.id}
                      onClick={() => mark(enquiry.id, 'contacted')}
                    >
                      Mark contacted
                    </Button>
                  )}
                  {enquiry.status !== 'closed' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      isLoading={saving === enquiry.id}
                      onClick={() => mark(enquiry.id, 'closed')}
                    >
                      Close
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </Container>
  )
}
