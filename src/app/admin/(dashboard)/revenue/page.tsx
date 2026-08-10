'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import {
  Wallet, TrendingUp, TrendingDown, ShoppingBag,
  Download, Calendar, Store, Receipt, ArrowLeft,
  BarChart3, Filter
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { adminUrl } from '@/lib/admin-path'

interface RevenueOverview {
  total: {
    revenue: number
    subtotal: number
    tax: number
    discount: number
    transactions: number
    averageValue: number
  }
  today: {
    revenue: number
    transactions: number
    growth: number
  }
  month: {
    revenue: number
    transactions: number
    growth: number
  }
  year: {
    revenue: number
    transactions: number
  }
  bySource: {
    store?: { total: number; count: number }
    billing?: { total: number; count: number }
  }
  paymentMethods: Array<{
    payment_method: string
    total: number
    count: number
  }>
  recentTransactions: Array<{
    id: number
    transaction_type: string
    reference_number: string
    customer_name: string
    total: number
    payment_method: string
    transaction_date: string
  }>
}

export default function RevenuePage() {
  const [overview, setOverview] = useState<RevenueOverview | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  })
  const [filter, setFilter] = useState({
    type: 'all',
    period: 'month',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOverview()
  }, [])

  const fetchOverview = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/revenue/overview')
      const data = await res.json()

      if (data.success) {
        setOverview(data.data)
      }
    } catch (error) {
      console.error('Error fetching revenue overview:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        type: filter.type,
        ...(dateRange.startDate && { startDate: dateRange.startDate }),
        ...(dateRange.endDate && { endDate: dateRange.endDate }),
      })

      const res = await fetch(`/api/admin/revenue/export?${params}`)

      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `revenue-export-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting revenue data:', error)
    }
  }

  if (loading) {
    return (
        <div className="min-h-screen bg-canvas">          <div className="flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-caramel-600"></div>
          </div>
        </div>
    )
  }

  if (!overview) {
    return null
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  ]

  return (
      <div className="min-h-screen bg-canvas">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <Link
              href={adminUrl()}
              className="mb-4 inline-flex items-center text-caramel-700 transition-colors hover:text-caramel-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Link>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-h1 text-text-primary">Revenue Management</h1>
                <p className="text-body text-text-secondary">Track revenue from store and local billing</p>
              </div>

              <Button
                variant="primary"
                leftIcon={<Download className="w-4 h-4" />}
                onClick={handleExport}
              >
                Export CSV
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Revenue */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Total Revenue</p>
                    <p className="text-2xl font-bold text-text-primary mt-2">
                      {formatCurrency(overview.total.revenue)}
                    </p>
                    <p className="text-xs text-text-tertiary mt-1">
                      {overview.total.transactions} transactions
                    </p>
                  </div>
                  <div className="p-3 bg-caramel-100 rounded-lg">
                    <Wallet className="h-8 w-8 text-caramel-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Today's Revenue */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Today's Revenue</p>
                    <p className="text-2xl font-bold text-text-primary mt-2">
                      {formatCurrency(overview.today.revenue)}
                    </p>
                    <div className="flex items-center mt-1">
                      {overview.today.growth >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-success-700 mr-1" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-danger-700 mr-1" />
                      )}
                      <span className={`text-xs font-medium ${
                        overview.today.growth >= 0 ? 'text-success-700' : 'text-danger-700'
                      }`}>
                        {Math.abs(overview.today.growth).toFixed(1)}% vs yesterday
                      </span>
                    </div>
                  </div>
                  <div className="rounded-md bg-caramel-100 p-3">
                    <Calendar className="h-8 w-8 text-success-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* This Month */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">This Month</p>
                    <p className="text-2xl font-bold text-text-primary mt-2">
                      {formatCurrency(overview.month.revenue)}
                    </p>
                    <div className="flex items-center mt-1">
                      {overview.month.growth >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-success-700 mr-1" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-danger-700 mr-1" />
                      )}
                      <span className={`text-xs font-medium ${
                        overview.month.growth >= 0 ? 'text-success-700' : 'text-danger-700'
                      }`}>
                        {Math.abs(overview.month.growth).toFixed(1)}% vs last month
                      </span>
                    </div>
                  </div>
                  <div className="rounded-md bg-caramel-100 p-3">
                    <TrendingUp className="h-7 w-7 text-caramel-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Average Transaction */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Avg Transaction</p>
                    <p className="text-2xl font-bold text-text-primary mt-2">
                      {formatCurrency(overview.total.averageValue)}
                    </p>
                    <p className="text-xs text-text-tertiary mt-1">
                      Per transaction
                    </p>
                  </div>
                  <div className="rounded-md bg-caramel-100 p-3">
                    <ShoppingBag className="h-7 w-7 text-caramel-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue by Source */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Source</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Store Revenue */}
                  <div className="flex items-center justify-between rounded-md bg-caramel-50 p-4">
                    <div className="flex items-center space-x-3">
                      <div className="rounded-sm bg-caramel-100 p-2">
                        <Store className="h-5 w-5 text-caramel-700" />
                      </div>
                      <div>
                        <p className="font-semibold text-text-primary">Online Store</p>
                        <p className="text-sm text-text-tertiary">
                          {overview.bySource.store?.count || 0} transactions
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-h2 text-text-primary">
                        {formatCurrency(overview.bySource.store?.total || 0)}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        {overview.total.revenue > 0
                          ? ((overview.bySource.store?.total || 0) / overview.total.revenue * 100).toFixed(1)
                          : 0}%
                      </p>
                    </div>
                  </div>

                  {/* Billing Revenue */}
                  <div className="flex items-center justify-between rounded-md bg-sage-50 p-4">
                    <div className="flex items-center space-x-3">
                      <div className="rounded-sm bg-sage-100 p-2">
                        <Receipt className="h-6 w-6 text-success-700" />
                      </div>
                      <div>
                        <p className="font-semibold text-text-primary">Local Shop Billing</p>
                        <p className="text-sm text-text-tertiary">
                          {overview.bySource.billing?.count || 0} transactions
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-success-700">
                        {formatCurrency(overview.bySource.billing?.total || 0)}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        {overview.total.revenue > 0
                          ? ((overview.bySource.billing?.total || 0) / overview.total.revenue * 100).toFixed(1)
                          : 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overview.paymentMethods.slice(0, 5).map((method) => (
                    <div key={method.payment_method} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-text-primary capitalize">
                          {method.payment_method?.replace('_', ' ') || 'Unknown'}
                        </p>
                        <p className="text-sm text-text-tertiary">{method.count} transactions</p>
                      </div>
                      <p className="font-semibold text-text-primary">
                        {formatCurrency(method.total)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card noPadding>
            <CardHeader className="px-6 pt-6">
              <div className="flex justify-between items-center">
                <CardTitle>Recent Transactions</CardTitle>
                <Button asChild variant="outline" size="sm">
                  <Link href={adminUrl('/revenue/transactions')}>View all</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div
                className="relative overflow-x-auto"
                tabIndex={0}
                role="region"
                aria-label="Recent transactions, scrolls sideways"
              >
                <table className="w-full">
                  <thead className="bg-canvas border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">
                        Reference
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">
                        Payment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {overview.recentTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-canvas">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              transaction.transaction_type === 'store'
                                ? 'bg-caramel-100 text-caramel-900'
                                : 'bg-sage-100 text-sage-900'
                            }`}
                          >
                            {transaction.transaction_type === 'store' ? (
                              <>
                                <Store className="h-3 w-3 mr-1" />
                                Store
                              </>
                            ) : (
                              <>
                                <Receipt className="h-3 w-3 mr-1" />
                                Billing
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                          {transaction.reference_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                          {transaction.customer_name || 'Guest'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-text-primary">
                          {formatCurrency(transaction.total)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary capitalize">
                          {transaction.payment_method?.replace('_', ' ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-tertiary">
                          {formatDate(transaction.transaction_date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  )
}
