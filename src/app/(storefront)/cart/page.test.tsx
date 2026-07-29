import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '@/components/ui/Toast'
import { addToCart } from '@/lib/cart'
import CartPage from './page'
import type { CartItem } from '@/types/order'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('next/image', () => ({
  default: ({ alt, ...props }: { alt: string }) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img alt={alt} {...props} />
  },
}))

const SOFA: CartItem = {
  product_id: 1,
  product_name: 'Emerald Velvet Sofa',
  product_slug: 'emerald-velvet-sofa',
  product_sku: 'VMC-SOF-101',
  product_image: '/seed/products/emerald-velvet-sofa-sm.webp',
  quantity: 1,
  unit_price: 185_000,
  stock_quantity: 4,
}

const renderCart = () =>
  render(
    <ToastProvider>
      <CartPage />
    </ToastProvider>
  )

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, data: { id: 1, orderNumber: 'ORD-1' } }),
  } as Response)
})

describe('an empty cart', () => {
  it('says so, and offers a way out', async () => {
    renderCart()
    expect(await screen.findByText(/your cart is empty/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /browse furniture/i })).toBeInTheDocument()
  })

  it('does not show a checkout form there is nothing to check out', async () => {
    renderCart()
    await screen.findByText(/your cart is empty/i)
    expect(screen.queryByRole('button', { name: /continue to payment/i })).not.toBeInTheDocument()
  })
})

describe('a cart with something in it', () => {
  beforeEach(() => addToCart(SOFA))

  it('shows the item and its price', async () => {
    renderCart()
    expect(await screen.findByText('Emerald Velvet Sofa')).toBeInTheDocument()
    expect(screen.getAllByText(/185,000/).length).toBeGreaterThan(0)
  })

  it('adds another when the increase control is used', async () => {
    renderCart()
    await screen.findByText('Emerald Velvet Sofa')

    await userEvent.click(screen.getByRole('button', { name: /increase quantity/i }))

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('shopping_cart') ?? '[]')[0].quantity).toBe(2)
    })
  })

  it('takes the item out when removed', async () => {
    renderCart()
    await screen.findByText('Emerald Velvet Sofa')

    await userEvent.click(screen.getByRole('button', { name: /remove/i }))

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('shopping_cart') ?? '[]')).toHaveLength(0)
    })
  })
})

/**
 * The checkout gate. These assert the two things that decide whether an order
 * is any use: that an incomplete one cannot be submitted, and that the
 * customer is told what is wrong in a way assistive technology can convey.
 */
describe('checkout validation', () => {
  beforeEach(() => addToCart(SOFA))

  it('refuses to submit an empty form', async () => {
    renderCart()
    await screen.findByText('Emerald Velvet Sofa')

    await userEvent.click(screen.getByRole('button', { name: /continue to payment/i }))

    expect(global.fetch).not.toHaveBeenCalledWith('/api/orders', expect.anything())
  })

  it('marks every missing field invalid and says why', async () => {
    renderCart()
    await screen.findByText('Emerald Velvet Sofa')

    await userEvent.click(screen.getByRole('button', { name: /continue to payment/i }))

    const alerts = await screen.findAllByRole('alert')
    expect(alerts.length).toBe(5)
    expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(5)
  })

  it('moves focus to the first field that failed', async () => {
    renderCart()
    await screen.findByText('Emerald Velvet Sofa')

    await userEvent.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => {
      expect(document.querySelector('input[name="name"]')).toHaveFocus()
    })
  })

  it('rejects an address that is not an email address', async () => {
    renderCart()
    await screen.findByText('Emerald Velvet Sofa')

    await userEvent.type(screen.getByRole('textbox', { name: /full name/i }), 'Arslan Khan')
    await userEvent.type(document.querySelector('input[name="email"]')!, 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: /continue to payment/i }))

    expect(await screen.findByText(/does not look like an email/i)).toBeInTheDocument()
  })

  it('clears a field error as soon as it is corrected', async () => {
    renderCart()
    await screen.findByText('Emerald Velvet Sofa')

    await userEvent.click(screen.getByRole('button', { name: /continue to payment/i }))
    expect(await screen.findByText(/we need a name for the delivery/i)).toBeInTheDocument()

    await userEvent.type(document.querySelector('input[name="name"]')!, 'Arslan Khan')

    await waitFor(() => {
      expect(screen.queryByText(/we need a name for the delivery/i)).not.toBeInTheDocument()
    })
  })

  it('submits once the form is complete', async () => {
    renderCart()
    await screen.findByText('Emerald Velvet Sofa')

    await userEvent.type(document.querySelector('input[name="name"]')!, 'Arslan Khan')
    await userEvent.type(document.querySelector('input[name="email"]')!, 'arslan@vemco.pk')
    await userEvent.type(document.querySelector('input[name="phone"]')!, '03001234567')
    await userEvent.type(document.querySelector('textarea[name="address"]')!, 'Showroom 14, Gulberg III')
    await userEvent.type(document.querySelector('input[name="city"]')!, 'Lahore')

    await userEvent.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/orders', expect.anything())
    })
  })

  /**
   * The cart is emptied on the success page, never before the redirect.
   * Clearing it early left an abandoned payment with an empty basket and no
   * way back -- the worst possible moment to lose one.
   */
  it('does not empty the cart on the way to payment', async () => {
    renderCart()
    await screen.findByText('Emerald Velvet Sofa')

    await userEvent.type(document.querySelector('input[name="name"]')!, 'Arslan Khan')
    await userEvent.type(document.querySelector('input[name="email"]')!, 'arslan@vemco.pk')
    await userEvent.type(document.querySelector('input[name="phone"]')!, '03001234567')
    await userEvent.type(document.querySelector('textarea[name="address"]')!, 'Showroom 14')
    await userEvent.type(document.querySelector('input[name="city"]')!, 'Lahore')

    await userEvent.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(JSON.parse(localStorage.getItem('shopping_cart') ?? '[]')).toHaveLength(1)
  })
})
