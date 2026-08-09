'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import Badge, { StatusBadge, StockBadge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { ImageUpload } from '@/components/ui/ImageUpload'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import {
  Package, ShoppingCart, Wallet, TrendingUp,
  Plus, Edit2, Trash2, Eye, Settings, Share2, Menu
} from 'lucide-react'
import { formatCurrency, slugify, generateSKU } from '@/lib/utils'
import { cn } from '@/lib/cn'
import { Product } from '@/types/product'
import { Category } from '@/types/category'
import { SocialMediaLink } from '@/types/social-media'

/** "products", "products and orders", "products, orders and receipts". */
const formatList = (items: string[]): string =>
  items.length <= 1
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [receipts, setReceipts] = useState<any[]>([])
  const [socialLinks, setSocialLinks] = useState<SocialMediaLink[]>([])
  const [navItems, setNavItems] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [productModal, setProductModal] = useState(false)
  const [categoryModal, setCategoryModal] = useState(false)
  const [socialModal, setSocialModal] = useState(false)
  const [navModal, setNavModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingSocial, setEditingSocial] = useState<SocialMediaLink | null>(null)
  const [editingNav, setEditingNav] = useState<any | null>(null)
  const [demoData, setDemoData] = useState<{ present: boolean; productCount: number } | null>(null)
  const [demoBusy, setDemoBusy] = useState(false)
  /** Resources whose last load failed, keyed by name. */
  const [failed, setFailed] = useState<Record<string, true>>({})
  const failedResources = Object.keys(failed)
  // One dialog serves every destructive action on this screen. Each handler
  // describes what it is about to do; the dialog just renders it.
  const [confirmState, setConfirmState] = useState<{
    title: string
    description: string
    confirmLabel: string
    destructive?: boolean
    onConfirm: () => void | Promise<void>
  } | null>(null)
  const { addToast } = useToast()

  // Form states
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    sku: '',
    category_id: '',
    price: '',
    stock_quantity: '',
    is_featured: false,
    image_url: '',
  })

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    parent_id: '',
  })

  const [socialForm, setSocialForm] = useState({
    platform: '',
    url: '',
    icon: '',
    display_order: 0,
    is_active: true,
  })

  const [navForm, setNavForm] = useState({
    label: '',
    href: '',
    parent_id: '',
    type: 'link',
    target: '_self',
    icon: '',
    display_order: 0,
    is_active: true,
    location: 'header',
  })

  useEffect(() => {
    fetchData()
  }, [])

  /**
   * Loads one resource and records it if it does not arrive.
   *
   * Each of these was its own copy of `.then(d => { if (d.success) set(...) })
   * .catch(console.error)`, which fails silently twice over: a network error
   * went to the console, and a `success: false` response was not even looked
   * at. Either way a tab rendered as though the shop genuinely had no
   * products, no orders, no receipts -- with nothing to click to find out
   * otherwise.
   */
  const load = async (
    resource: string,
    url: string,
    apply: (data: any) => void
  ): Promise<void> => {
    try {
      const res = await fetch(url)
      const body = await res.json()
      if (!res.ok || !body.success) throw new Error(body.message || 'Request failed')
      apply(body.data)
      setFailed(current => {
        if (!current[resource]) return current
        const next = { ...current }
        delete next[resource]
        return next
      })
    } catch (error) {
      console.error(`Failed to load ${resource}:`, error)
      setFailed(current => ({ ...current, [resource]: true }))
    }
  }

  const fetchData = async () => {
    await Promise.all([
      load('products', '/api/products?limit=100', data => setProducts(data.products || [])),
      load('categories', '/api/categories', data => setCategories(data || [])),
      load('orders', '/api/orders?limit=10', data => setOrders(data || [])),
      load('receipts', '/api/billing', data => setReceipts(data || [])),
      load('social links', '/api/social-media', data => setSocialLinks(data.links || [])),
      load('navigation', '/api/nav', data => setNavItems(data || [])),
      load('demo data status', '/api/admin/demo-data', data => setDemoData(data)),
    ])
  }

  const handleSeedDemo = async () => {
    setDemoBusy(true)
    try {
      const res = await fetch('/api/admin/demo-data', { method: 'POST' })
      const data = await res.json()
      addToast(data.message || 'Demo data loaded', data.success ? 'success' : 'error')
      fetchData()
    } catch (error) {
      console.error('Error seeding demo data:', error)
      addToast('Failed to load demo data', 'error')
    } finally {
      setDemoBusy(false)
    }
  }

  const handleClearDemo = () =>
    setConfirmState({
      title: 'Remove the demo catalogue?',
      description:
        'This deletes only the products, categories, navigation and social links that were seeded. Anything you added yourself is kept.',
      confirmLabel: 'Remove demo data',
      destructive: true,
      onConfirm: async () => {
        setDemoBusy(true)
        try {
          const res = await fetch('/api/admin/demo-data', { method: 'DELETE' })
          const data = await res.json()
          addToast(data.message || 'Demo data cleared', data.success ? 'success' : 'error')
          fetchData()
        } catch (error) {
          console.error('Error clearing demo data:', error)
          addToast('Failed to clear demo data', 'error')
        } finally {
          setDemoBusy(false)
        }
      },
    })

  const saveProduct = async () => {
    try {
      const url = editingProduct
        ? `/api/products/${editingProduct.id}`
        : '/api/products'

      const method = editingProduct ? 'PUT' : 'POST'

      const payload: any = {
        ...productForm,
        price: parseFloat(productForm.price),
        stock_quantity: parseInt(productForm.stock_quantity),
        category_id: parseInt(productForm.category_id),
        sku: productForm.sku || generateSKU(productForm.name),
        slug: slugify(productForm.name),
      }

      // Add image if provided
      if (productForm.image_url) {
        payload.images = [{
          image_url: productForm.image_url,
          is_primary: true,
          display_order: 1,
        }]
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (data.success) {
        addToast(editingProduct ? 'Product updated' : 'Product created', 'success')
        setProductModal(false)
        setEditingProduct(null)
        setProductForm({
          name: '',
          description: '',
          sku: '',
          category_id: '',
          price: '',
          stock_quantity: '',
          is_featured: false,
          image_url: '',
        })
        fetchData()
      } else {
        addToast(data.message || 'Failed to save product', 'error')
      }
    } catch (error) {
      console.error('Error saving product:', error)
      addToast('Failed to save product', 'error')
    }
  }

  const deleteProduct = (product: Product) =>
    setConfirmState({
      title: 'Delete this product?',
      // Name the record. "Delete this product?" alone tells the operator
      // nothing about which row they clicked.
      description: `${product.name} (${product.sku}) will be removed from the store, along with its images. Orders that already reference it keep their line items.`,
      confirmLabel: 'Delete product',
      destructive: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' })
          const data = await res.json()

          if (data.success) {
            addToast('Product deleted', 'success')
            fetchData()
          } else {
            addToast('Failed to delete product', 'error')
          }
        } catch (error) {
          console.error('Error deleting product:', error)
          addToast('Failed to delete product', 'error')
        }
      },
    })

  const saveCategory = async () => {
    try {
      const url = editingCategory
        ? `/api/categories/${editingCategory.id}`
        : '/api/categories'

      const method = editingCategory ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...categoryForm,
          parent_id: categoryForm.parent_id ? parseInt(categoryForm.parent_id) : null,
          slug: slugify(categoryForm.name),
        }),
      })

      const data = await res.json()

      if (data.success) {
        addToast(editingCategory ? 'Category updated' : 'Category created', 'success')
        setCategoryModal(false)
        setEditingCategory(null)
        setCategoryForm({
          name: '',
          description: '',
          parent_id: '',
        })
        fetchData()
      } else {
        addToast(data.message || 'Failed to save category', 'error')
      }
    } catch (error) {
      console.error('Error saving category:', error)
      addToast('Failed to save category', 'error')
    }
  }

  const saveSocial = async () => {
    try {
      const url = editingSocial
        ? `/api/social-media/${editingSocial.id}`
        : '/api/social-media'

      const method = editingSocial ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...socialForm,
          is_active: socialForm.is_active ? 1 : 0,
        }),
      })

      const data = await res.json()

      if (data.success) {
        addToast(editingSocial ? 'Social link updated' : 'Social link created', 'success')
        setSocialModal(false)
        setEditingSocial(null)
        setSocialForm({
          platform: '',
          url: '',
          icon: '',
          display_order: 0,
          is_active: true,
        })
        fetchData()
      } else {
        addToast(data.message || 'Failed to save social link', 'error')
      }
    } catch (error) {
      console.error('Error saving social link:', error)
      addToast('Failed to save social link', 'error')
    }
  }

  const deleteSocial = (link: SocialMediaLink) =>
    setConfirmState({
      title: 'Delete this social link?',
      description: `The ${link.platform} link will stop appearing in the footer.`,
      confirmLabel: 'Delete link',
      destructive: true,
      onConfirm: () => runDeleteSocial(link.id),
    })

  const runDeleteSocial = async (id: number) => {
    try {
      const res = await fetch(`/api/social-media/${id}`, { method: 'DELETE' })
      const data = await res.json()

      if (data.success) {
        addToast('Social link deleted', 'success')
        fetchData()
      } else {
        addToast('Failed to delete social link', 'error')
      }
    } catch (error) {
      console.error('Error deleting social link:', error)
      addToast('Failed to delete social link', 'error')
    }
  }

  const saveNav = async () => {
    try {
      const url = editingNav
        ? `/api/nav/${editingNav.id}`
        : '/api/nav'

      const method = editingNav ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...navForm,
          parent_id: navForm.parent_id || null,
          is_active: navForm.is_active ? 1 : 0,
        }),
      })

      const data = await res.json()

      if (data.success) {
        addToast(editingNav ? 'Nav item updated' : 'Nav item created', 'success')
        setNavModal(false)
        setEditingNav(null)
        setNavForm({
          label: '',
          href: '',
          parent_id: '',
          type: 'link',
          target: '_self',
          icon: '',
          display_order: 0,
          is_active: true,
          location: 'header',
        })
        fetchData()
      } else {
        addToast(data.message || 'Failed to save nav item', 'error')
      }
    } catch (error) {
      console.error('Error saving nav item:', error)
      addToast('Failed to save nav item', 'error')
    }
  }

  const deleteNav = (item: any) =>
    setConfirmState({
      title: 'Delete this navigation item?',
      description: `"${item.label}" will be removed from the ${item.location} navigation. Any child items are removed with it.`,
      confirmLabel: 'Delete item',
      destructive: true,
      onConfirm: () => runDeleteNav(item.id),
    })

  const runDeleteNav = async (id: number) => {
    try {
      const res = await fetch(`/api/nav/${id}`, { method: 'DELETE' })
      const data = await res.json()

      if (data.success) {
        addToast('Nav item deleted', 'success')
        fetchData()
      } else {
        addToast('Failed to delete nav item', 'error')
      }
    } catch (error) {
      console.error('Error deleting nav item:', error)
      addToast('Failed to delete nav item', 'error')
    }
  }

  const handleMarkAsPaid = (order: any) =>
    setConfirmState({
      title: 'Mark this order as paid?',
      description: `${order.order_number} for ${formatCurrency(order.total)} will be recorded as revenue. This cannot be undone from here.`,
      confirmLabel: 'Mark as paid',
      onConfirm: () => runMarkAsPaid(order.id),
    })

  const runMarkAsPaid = async (orderId: number) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentStatus: 'paid',
          paymentMethod: 'manual', // Admin manually marked as paid
        }),
      })

      const data = await res.json()

      if (data.success) {
        addToast('Order marked as paid successfully!', 'success')
        fetchData() // Refresh orders list
      } else {
        addToast(data.message || 'Failed to update order', 'error')
      }
    } catch (error) {
      console.error('Error updating order:', error)
      addToast('Failed to update order', 'error')
    }
  }

  const toggleNavActive = async (item: any) => {
    try {
      const res = await fetch(`/api/nav/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...item,
          is_active: item.is_active === 1 ? 0 : 1,
        }),
      })

      const data = await res.json()

      if (data.success) {
        addToast(`Nav item ${item.is_active === 1 ? 'deactivated' : 'activated'}`, 'success')
        fetchData()
      } else {
        addToast('Failed to update nav item', 'error')
      }
    } catch (error) {
      console.error('Error updating nav item:', error)
      addToast('Failed to update nav item', 'error')
    }
  }

  // Calculate stats
  const totalProducts = products.length
  const totalOrders = orders.length
  /**
   * Money that actually arrived, not money that was asked for.
   *
   * This summed every order regardless of payment status. An order is created
   * before the customer is sent to pay, so an abandoned checkout -- or a card
   * that was declined -- counted in full. Two unpaid test orders were enough
   * to show Rs 464,920 of "Store Revenue" against takings of nothing, and a
   * shop reading that figure would be reconciling against a number no bank
   * statement will ever match.
   */
  const isPaid = (order: any) => order.payment_status === 'paid' || order.payment_status === 'completed'
  const paidOrders = orders.filter(isPaid)
  const totalRevenue = paidOrders.reduce((sum, order) => sum + (order.total || 0), 0)
  const lowStockProducts = products.filter(p => p.stock_quantity <= 5).length

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'categories', label: 'Categories', icon: Settings },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'navigation', label: 'Navigation', icon: Menu },
    { id: 'social', label: 'Social Media', icon: Share2 },
  ]

  return (
    <>
      <ConfirmDialog
        isOpen={confirmState !== null}
        onClose={() => setConfirmState(null)}
        onConfirm={() => confirmState?.onConfirm()}
        title={confirmState?.title ?? ''}
        description={confirmState?.description ?? ''}
        confirmLabel={confirmState?.confirmLabel}
        destructive={confirmState?.destructive}
      />

      <div className="min-h-screen bg-canvas">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-h1 text-text-primary">Admin dashboard</h1>
          <p className="text-body text-text-secondary">Manage the shop</p>
        </div>

        {/* Says which loads failed, rather than letting the affected tabs
            render as convincingly empty. */}
        {failedResources.length > 0 && (
          <div
            role="alert"
            className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger-100 bg-danger-50 p-4"
          >
            <p className="text-ui text-danger-900">
              Could not load {formatList(failedResources)}. What you see below may be
              incomplete.
            </p>
            <Button variant="outline" size="sm" onClick={fetchData}>
              Try again
            </Button>
          </div>
        )}

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Admin sections"
          // Six tabs do not fit a phone. Scrolling the strip keeps them all
          // reachable; wrapping would push the content down a line on every
          // narrow screen.
          className="no-scrollbar mb-6 flex space-x-1 overflow-x-auto border-b border-border-subtle"
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 text-ui font-medium',
                'transition-colors duration-fast ease-standard',
                activeTab === tab.id
                  ? 'border-action text-text-primary'
                  : 'border-transparent text-text-tertiary hover:text-text-primary'
              )}
            >
              <tab.icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Total Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-h1 text-text-primary">{totalProducts}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Total Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-h1 text-text-primary">{totalOrders}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Store Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-h1 text-text-primary">
                    {formatCurrency(totalRevenue)}
                  </p>
                  {/* Says which orders it counted, so the figure can be
                      reconciled rather than guessed at. */}
                  <p className="text-sm text-text-tertiary">
                    From {paidOrders.length} paid {paidOrders.length === 1 ? 'order' : 'orders'}
                    {orders.length > paidOrders.length &&
                      ` · ${orders.length - paidOrders.length} awaiting payment`}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Low Stock Alert</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={cn('text-h1', lowStockProducts > 0 ? 'text-danger-700' : 'text-text-primary')}>
                    {lowStockProducts}
                  </p>
                  <p className="text-sm text-text-tertiary">Products need restocking</p>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Management Card */}
            <Card interactive className="border border-caramel-200 bg-caramel-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-text-primary mb-2">
                      Revenue Management
                    </h3>
                    <p className="text-text-secondary">
                      Track and analyze revenue from both online store and local billing
                    </p>
                  </div>
                  <div className="p-4 bg-caramel-100 rounded-lg">
                    <Wallet className="h-10 w-10 text-caramel-600" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-surface rounded-lg p-4">
                    <p className="text-sm text-text-secondary mb-1">Total Revenue</p>
                    <p className="text-lg font-bold text-text-primary">View Details</p>
                  </div>
                  <div className="bg-surface rounded-lg p-4">
                    <p className="text-sm text-text-secondary mb-1">Store vs Billing</p>
                    <p className="text-lg font-bold text-text-primary">Compare</p>
                  </div>
                  <div className="bg-surface rounded-lg p-4">
                    <p className="text-sm text-text-secondary mb-1">Export Data</p>
                    <p className="text-lg font-bold text-text-primary">CSV</p>
                  </div>
                </div>

                <Button
                  asChild
                  variant="primary"
                  size="lg"
                  fullWidth
                  leftIcon={<Wallet className="h-4 w-4" />}
                >
                  <Link href="/admin/revenue">Open revenue dashboard</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Demo catalogue */}
            <Card className="mt-6">
              <CardContent className="p-0">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="mb-1 text-h3 text-text-primary">Demo catalogue</h3>
                    <p className="max-w-prose text-ui text-text-secondary">
                      {demoData === null
                        ? 'Checking…'
                        : demoData.present
                          ? 'Twenty sample products across five categories, with navigation, social links and photography. Clearing removes only these — anything you added yourself is kept.'
                          : 'No demo data is loaded. Seeding adds a sample furniture catalogue so the storefront has something to show.'}
                    </p>
                  </div>
                  <Badge variant={demoData?.present ? 'default' : 'secondary'}>
                    {demoData === null ? '—' : demoData.present ? 'Loaded' : 'Not loaded'}
                  </Badge>
                </div>

                <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2">
                  <div>
                    <p className="text-caption text-text-tertiary">Products in store</p>
                    <p className="text-h3 tabular-nums text-text-primary">
                      {demoData?.productCount ?? '—'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="outline"
                    onClick={handleSeedDemo}
                    isLoading={demoBusy}
                    disabled={demoBusy || demoData?.present}
                    leftIcon={<Package className="h-4 w-4" />}
                  >
                    Load demo data
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleClearDemo}
                    isLoading={demoBusy}
                    disabled={demoBusy || !demoData?.present}
                    leftIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                  >
                    Clear demo data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Products */}
        {activeTab === 'products' && (
          <div>
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-semibold">Products</h2>
              <Button
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setEditingProduct(null)
                  setProductForm({
                    name: '',
                    description: '',
                    sku: '',
                    category_id: '',
                    price: '',
                    stock_quantity: '',
                    is_featured: false,
                    image_url: '',
                  })
                  setProductModal(true)
                }}
              >
                Add Product
              </Button>
            </div>

            <Card noPadding>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-canvas border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-bark-700">Product</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-bark-700">SKU</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-bark-700">Category</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-bark-700">Price</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-bark-700">Stock</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-bark-700">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-bark-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {products.map(product => (
                      <tr key={product.id} className="hover:bg-canvas">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={product.primary_image || '/placeholder.svg'}
                              alt={product.name}
                              className="w-10 h-10 object-cover rounded"
                            />
                            <div>
                              <p className="font-medium text-sm">{product.name}</p>
                              <p className="text-xs text-text-tertiary truncate max-w-xs">
                                {product.description}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{product.sku}</td>
                        <td className="px-4 py-3 text-sm">{product.category_name}</td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {formatCurrency(product.price)}
                        </td>
                        <td className="px-4 py-3">
                          <StockBadge quantity={product.stock_quantity} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={product.is_active ? 'active' : 'inactive'} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingProduct(product)
                                setProductForm({
                                  name: product.name,
                                  description: product.description || '',
                                  sku: product.sku,
                                  category_id: product.category_id.toString(),
                                  price: product.price.toString(),
                                  stock_quantity: product.stock_quantity.toString(),
                                  is_featured: Boolean(product.is_featured),
                                  image_url: product.images?.[0]?.image_url || '',
                                })
                                setProductModal(true)
                              }}
                              aria-label={`Edit ${product.name}`}
                              className="rounded-sm p-1 text-text-secondary transition-colors duration-fast hover:bg-surface-subtle hover:text-text-primary"
                            >
                              <Edit2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              onClick={() => deleteProduct(product)}
                              aria-label={`Delete ${product.name}`}
                              className="rounded-sm p-1 text-text-secondary transition-colors duration-fast hover:bg-danger-50 hover:text-danger-700"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Categories */}
        {activeTab === 'categories' && (
          <div>
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-semibold">Categories</h2>
              <Button
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setEditingCategory(null)
                  setCategoryForm({
                    name: '',
                    description: '',
                    parent_id: '',
                  })
                  setCategoryModal(true)
                }}
              >
                Add Category
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map(category => (
                <Card key={category.id}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{category.name}</h3>
                      <p className="text-sm text-text-secondary mt-1">{category.description}</p>
                      <p className="text-xs text-text-tertiary mt-2">
                        {category.product_count || 0} products
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingCategory(category)
                          setCategoryForm({
                            name: category.name,
                            description: category.description || '',
                            parent_id: category.parent_id?.toString() || '',
                          })
                          setCategoryModal(true)
                        }}
                        aria-label={`Edit ${category.name}`}
                        className="rounded-sm p-1 text-text-secondary transition-colors duration-fast hover:bg-surface-subtle hover:text-text-primary"
                      >
                        <Edit2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Orders */}
        {activeTab === 'orders' && (
          <Card noPadding>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-canvas border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-bark-700">Order #</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-bark-700">Customer</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-bark-700">Total</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-bark-700">Order Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-bark-700">Payment Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-bark-700">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-bark-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map(order => (
                    <tr key={order.id} className="hover:bg-canvas">
                      <td className="px-4 py-3 text-sm font-medium">{order.order_number}</td>
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <p>{order.customer_name || 'Guest'}</p>
                          <p className="text-xs text-text-tertiary">{order.customer_email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3">
                        {/* StatusBadge already maps paid, pending and failed
                            to the same three states this reimplemented by
                            hand, one column across from where it is used. */}
                        <StatusBadge status={order.payment_status || 'pending'} />
                      </td>
                      <td className="px-4 py-3 text-sm text-text-tertiary">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {(order.payment_status === 'pending') && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleMarkAsPaid(order)}
                          >
                            Mark as Paid
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Social Media */}
        {activeTab === 'social' && (
          <div>
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-semibold">Social Media Links</h2>
              <Button
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setEditingSocial(null)
                  setSocialForm({
                    platform: '',
                    url: '',
                    icon: '',
                    display_order: 0,
                    is_active: true,
                  })
                  setSocialModal(true)
                }}
              >
                Add Social Link
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {socialLinks.map((link) => (
                <Card key={link.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="bg-gradient-to-br from-caramel-500 to-caramel-700 p-3 rounded-lg">
                          <Share2 className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{link.platform}</h3>
                          <p className="text-sm text-text-tertiary">Order: {link.display_order}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setEditingSocial(link)
                            setSocialForm({
                              platform: link.platform,
                              url: link.url,
                              icon: link.icon,
                              display_order: link.display_order,
                              is_active: link.is_active === 1,
                            })
                            setSocialModal(true)
                          }}
                          aria-label={`Edit the ${link.platform} link`}
                          className="p-2 hover:bg-surface-subtle rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => deleteSocial(link)}
                          aria-label={`Delete the ${link.platform} link`}
                          className="p-2 hover:bg-surface-subtle rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <span className="text-text-tertiary w-16">Icon:</span>
                        <span className="font-mono bg-surface-subtle px-2 py-1 rounded text-xs">
                          {link.icon}
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        <span className="text-text-tertiary w-16">URL:</span>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate flex-1 text-caramel-700 hover:underline"
                        >
                          {link.url}
                        </a>
                      </div>
                      <div className="flex items-center text-sm">
                        <span className="text-text-tertiary w-16">Status:</span>
                        <Badge variant={link.is_active ? 'success' : 'secondary'}>
                          {link.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {socialLinks.length === 0 && (
                <div className="col-span-full text-center py-12 text-text-tertiary">
                  <Share2 className="h-12 w-12 mx-auto mb-4 text-bark-400" />
                  <p>No social media links yet.</p>
                  <p className="text-sm mt-2">Click "Add Social Link" to get started.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Tab */}
        {activeTab === 'navigation' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Navigation Items</h2>
              <Button
                variant="primary"
                onClick={() => {
                  setEditingNav(null)
                  setNavForm({
                    label: '',
                    href: '',
                    parent_id: '',
                    type: 'link',
                    target: '_self',
                    icon: '',
                    display_order: 0,
                    is_active: true,
                    location: 'header',
                  })
                  setNavModal(true)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Nav Item
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {navItems.map(item => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{item.label}</h3>
                        <p className="text-sm text-text-tertiary capitalize">{item.type}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNav(item)
                            setNavForm({
                              label: item.label,
                              href: item.href,
                              parent_id: item.parent_id?.toString() || '',
                              type: item.type,
                              target: item.target,
                              icon: item.icon || '',
                              display_order: item.display_order,
                              is_active: item.is_active === 1,
                              location: item.location,
                            })
                            setNavModal(true)
                          }}
                          aria-label={`Edit the ${item.label} nav item`}
                          className="p-2 hover:bg-surface-subtle rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteNav(item)}
                          aria-label={`Delete the ${item.label} nav item`}
                          className="p-2 hover:bg-surface-subtle rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <span className="text-text-tertiary w-20">Href:</span>
                        <span className="text-xs font-mono bg-surface-subtle px-2 py-1 rounded truncate flex-1">
                          {item.href}
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        <span className="text-text-tertiary w-20">Order:</span>
                        <span className="font-medium">{item.display_order}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <span className="text-text-tertiary w-20">Status:</span>
                        {/* This one is a control, not a label -- it toggles.
                            aria-pressed says so; before, the only clue that
                            it did anything was that the cursor changed. */}
                        <button
                          type="button"
                          onClick={() => toggleNavActive(item)}
                          aria-pressed={item.is_active}
                          aria-label={`${item.label} is ${item.is_active ? 'active' : 'inactive'}. Toggle.`}
                          className={cn(
                            'rounded-xs px-2 py-1 text-caption font-medium',
                            'transition-colors duration-fast ease-standard',
                            item.is_active
                              ? 'bg-success-100 text-success-900 hover:bg-success-200'
                              : 'bg-surface-subtle text-text-secondary hover:bg-bark-200'
                          )}
                        >
                          {item.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {navItems.length === 0 && (
                <div className="col-span-full text-center py-12 text-text-tertiary">
                  <Menu className="h-12 w-12 mx-auto mb-4 text-bark-400" />
                  <p>No navigation items yet.</p>
                  <p className="text-sm mt-2">Click "Add Nav Item" to get started.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Product Modal */}
      <Modal
        isOpen={productModal}
        onClose={() => setProductModal(false)}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Product Name"
            value={productForm.name}
            onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
            required
          />

          <Input
            label="Description"
            value={productForm.description}
            onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-bark-700 mb-2">
              Product Image
            </label>
            <ImageUpload
              value={productForm.image_url}
              onChange={(url) => setProductForm({ ...productForm, image_url: url })}
              onRemove={() => setProductForm({ ...productForm, image_url: '' })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="SKU"
              value={productForm.sku}
              onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
              placeholder="Auto-generated if empty"
            />

            <Select
              label="Category"
              value={productForm.category_id}
              onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
              options={categories.map(cat => ({
                value: cat.id.toString(),
                label: cat.name,
              }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price"
              type="number"
              step="0.01"
              value={productForm.price}
              onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
              required
            />

            <Input
              label="Stock Quantity"
              type="number"
              value={productForm.stock_quantity}
              onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })}
              required
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setProductModal(false)} fullWidth>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveProduct} fullWidth>
              {editingProduct ? 'Update' : 'Create'} Product
            </Button>
          </div>
        </div>
      </Modal>

      {/* Category Modal */}
      <Modal
        isOpen={categoryModal}
        onClose={() => setCategoryModal(false)}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
      >
        <div className="space-y-4">
          <Input
            label="Category Name"
            value={categoryForm.name}
            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
            required
          />

          <Input
            label="Description"
            value={categoryForm.description}
            onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
          />

          <Select
            label="Parent Category (Optional)"
            value={categoryForm.parent_id}
            onChange={(e) => setCategoryForm({ ...categoryForm, parent_id: e.target.value })}
            options={[
              { value: '', label: 'None (Top Level)' },
              ...categories
                .filter(cat => cat.id !== editingCategory?.id)
                .map(cat => ({
                  value: cat.id.toString(),
                  label: cat.name,
                }))
            ]}
          />

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setCategoryModal(false)} fullWidth>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveCategory} fullWidth>
              {editingCategory ? 'Update' : 'Create'} Category
            </Button>
          </div>
        </div>
      </Modal>

      {/* Social Media Modal */}
      <Modal
        isOpen={socialModal}
        onClose={() => setSocialModal(false)}
        title={editingSocial ? 'Edit Social Link' : 'Add Social Link'}
      >
        <div className="space-y-4">
          <Input
            label="Platform Name"
            value={socialForm.platform}
            onChange={(e) => setSocialForm({ ...socialForm, platform: e.target.value })}
            placeholder="e.g., Facebook, Instagram, Twitter"
            required
          />

          <Input
            label="URL"
            value={socialForm.url}
            onChange={(e) => setSocialForm({ ...socialForm, url: e.target.value })}
            placeholder="https://facebook.com/yourpage"
            required
          />

          <Select
            label="Icon"
            value={socialForm.icon}
            onChange={(e) => setSocialForm({ ...socialForm, icon: e.target.value })}
            options={[
              { value: '', label: 'Select an icon' },
              { value: 'facebook', label: 'Facebook' },
              { value: 'instagram', label: 'Instagram' },
              { value: 'twitter', label: 'Twitter / X' },
              { value: 'linkedin', label: 'LinkedIn' },
              { value: 'youtube', label: 'YouTube' },
            ]}
            required
          />

          <Input
            label="Display Order"
            type="number"
            value={socialForm.display_order.toString()}
            onChange={(e) => setSocialForm({ ...socialForm, display_order: parseInt(e.target.value) || 0 })}
            helperText="Lower numbers appear first"
          />

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="social-active"
              checked={socialForm.is_active}
              onChange={(e) => setSocialForm({ ...socialForm, is_active: e.target.checked })}
              className="w-4 h-4 text-caramel-600 border-border-strong rounded focus-visible:ring-ring"
            />
            <label htmlFor="social-active" className="text-sm font-medium text-bark-700">
              Active
            </label>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setSocialModal(false)} fullWidth>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveSocial} fullWidth>
              {editingSocial ? 'Update' : 'Create'} Link
            </Button>
          </div>
        </div>
      </Modal>

      {/* Navigation Modal */}
      <Modal
        isOpen={navModal}
        onClose={() => setNavModal(false)}
        title={editingNav ? 'Edit Navigation Item' : 'Add Navigation Item'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Label"
            value={navForm.label}
            onChange={(e) => setNavForm({ ...navForm, label: e.target.value })}
            required
          />

          <Input
            label="Href / URL"
            value={navForm.href}
            onChange={(e) => setNavForm({ ...navForm, href: e.target.value })}
            placeholder="/products or https://example.com"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type"
              value={navForm.type}
              onChange={(e) => setNavForm({ ...navForm, type: e.target.value })}
              options={[
                { value: 'link', label: 'Link' },
                { value: 'button', label: 'Button' },
                { value: 'dropdown', label: 'Dropdown' },
                { value: 'group', label: 'Group' },
              ]}
              required
            />

            <Select
              label="Target"
              value={navForm.target}
              onChange={(e) => setNavForm({ ...navForm, target: e.target.value })}
              options={[
                { value: '_self', label: 'Same Tab' },
                { value: '_blank', label: 'New Tab' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Location"
              value={navForm.location}
              onChange={(e) => setNavForm({ ...navForm, location: e.target.value })}
              options={[
                { value: 'header', label: 'Header' },
                { value: 'footer', label: 'Footer' },
              ]}
            />

            <Input
              label="Display Order"
              type="number"
              value={navForm.display_order.toString()}
              onChange={(e) => setNavForm({ ...navForm, display_order: parseInt(e.target.value) || 0 })}
              helperText="Lower numbers appear first"
            />
          </div>

          <Input
            label="Icon (optional)"
            value={navForm.icon}
            onChange={(e) => setNavForm({ ...navForm, icon: e.target.value })}
            placeholder="lucide-react icon name"
          />

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="nav-active"
              checked={navForm.is_active}
              onChange={(e) => setNavForm({ ...navForm, is_active: e.target.checked })}
              className="w-4 h-4 text-caramel-600 border-border-strong rounded focus-visible:ring-ring"
            />
            <label htmlFor="nav-active" className="text-sm font-medium text-bark-700">
              Active
            </label>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setNavModal(false)} fullWidth>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveNav} fullWidth>
              {editingNav ? 'Update' : 'Create'} Nav Item
            </Button>
          </div>
        </div>
      </Modal>
      </div>
    </>
  )
}