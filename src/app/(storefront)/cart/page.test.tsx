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
    json: async () => ({ success: true, data: { id: 1, reference: 'VIM-K7R2QX' } }),
  } as Response)
})

describe('an empty cart', () => {
  it('says so, and offers a way out', async () => {
    renderCart()
    expect(await screen.findByText(/your cart is empty/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /browse furniture/i })).toBeInTheDocument()
  })

  it('does not show an enquiry form when there is nothing to ask about', async () => {
    renderCart()
    await screen.findByText(/your cart is empty/i)
    expect(screen.queryByRole('button', { name: /send enquiry/i })).not.toBeInTheDocument()
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
 * The enquiry gate.
 *
 * Nothing is paid for on this website, so the thing that decides whether the
 * online shop works at all is whether an enquiry can reach the shop with a
 * name and a number attached -- and whether an incomplete one is refused
 * clearly enough that the customer fixes it rather than leaving.
 */
describe('sending an enquiry', () => {
  beforeEach(() => addToCart(SOFA))

  const send = () => screen.getByRole('button', { name: /send enquiry/i })

  it('refuses to submit an empty form', async () => {
    renderCart()
    await screen.findByText('Emerald Velvet Sofa')

    await userEvent.click(send())

    expect(global.fetch).not.toHaveBeenCalledWith('/api/enquiries', expect.anything())
  })

  /**
   * Name, phone and -- because a visit is the default -- a day. Everything
   * else is optional on purpose: this form exists to start a phone call, and
   * every extra required field is another reason to abandon it.
   */
  it('marks the missing fields invalid and says why', async () => {
    renderCart()
    await screen.findByText('Emerald Velvet Sofa')

    await userEvent.click(send())

    const alerts = await screen.findAllByRole('alert')
    expect(alerts.length).toBe(3)
    expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(3)
  })

  it('moves focus to the first field that failed', async () => {
    renderCart()
    await screen.findByText('Emerald Velvet Sofa')

    await userEvent.click(send())

    await waitFor(() => {
      expect(document.querySelector('input[name="name"]')).toHaveFocus()
    })
  })

  it('does not ask for a visit date unless they are asking to visit', async () => {
    renderCart()
    await screen.findByText('Emerald Velvet Sofa')

    expect(document.querySelector('input[name="visitDate"]')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: /buy and have it delivered/i }))

    expect(document.querySelector('input[name="visitDate"]')).not.toBeInTheDocument()
  })

  /**
   * The email is optional, so an empty one must pass -- but a typed one has
   * to be usable, because it is where the written copy of the reference goes.
   */
  it('accepts no email, and rejects a broken one', async () => {
    renderCart()
    await screen.findByText('Emerald Velvet Sofa')

    await userEvent.type(document.querySelector('input[name="email"]')!, 'not-an-email')
    await userEvent.click(send())

    expect(await screen.findByText(/does not look like an email/i)).toBeInTheDocument()
  })

  it('clears a field error as soon as it is corrected', async () => {
    renderCart()
    await screen.findByText('Emerald Velvet Sofa')

    await userEvent.click(send())
    expect(await screen.findByText(/we need a name to put on the enquiry/i)).toBeInTheDocument()

    await userEvent.type(document.querySelector('input[name="name"]')!, 'Arslan Khan')

    await waitFor(() => {
      expect(screen.queryByText(/we need a name to put on the enquiry/i)).not.toBeInTheDocument()
    })
  })

  it('sends once a name, a number and a day are given', async () => {
    renderCart()
    await screen.findByText('Emerald Velvet Sofa')

    await userEvent.type(document.querySelector('input[name="name"]')!, 'Arslan Khan')
    await userEvent.type(document.querySelector('input[name="phone"]')!, '03001234567')
    await userEvent.type(document.querySelector('input[name="visitDate"]')!, '2026-09-01')

    await userEvent.click(send())

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/enquiries', expect.anything())
    })
  })

  it('goes through without an email address', async () => {
    renderCart()
    await screen.findByText('Emerald Velvet Sofa')

    await userEvent.click(screen.getByRole('radio', { name: /reserve this piece/i }))
    await userEvent.type(document.querySelector('input[name="name"]')!, 'Arslan Khan')
    await userEvent.type(document.querySelector('input[name="phone"]')!, '03001234567')

    await userEvent.click(send())

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/enquiries', expect.anything())
    })
  })

  /**
   * Nothing has been bought, so the basket stays. A customer who rings the
   * shop an hour later wants the same list in front of them.
   */
  it('keeps the basket after sending', async () => {
    renderCart()
    await screen.findByText('Emerald Velvet Sofa')

    await userEvent.click(screen.getByRole('radio', { name: /buy and have it delivered/i }))
    await userEvent.type(document.querySelector('input[name="name"]')!, 'Arslan Khan')
    await userEvent.type(document.querySelector('input[name="phone"]')!, '03001234567')

    await userEvent.click(send())

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(JSON.parse(localStorage.getItem('shopping_cart') ?? '[]')).toHaveLength(1)
  })
})
