import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addToCart,
  clearCart,
  getCart,
  getCartItem,
  getCartItemCount,
  getCartTotal,
  isInCart,
  removeFromCart,
  saveCart,
  updateCartItemQuantity,
} from './cart'
import type { CartItem } from '@/types/order'

/**
 * The cart decides what the customer is charged, and until now nothing
 * asserted it did so correctly. The gates check how the shop looks and
 * whether it can be operated; these check whether it adds up.
 */
const item = (overrides: Partial<CartItem> = {}): CartItem => ({
  product_id: 1,
  product_name: 'Emerald Velvet Sofa',
  product_slug: 'emerald-velvet-sofa',
  product_sku: 'VMC-SOF-101',
  product_image: '/seed/products/emerald-velvet-sofa-sm.webp',
  quantity: 1,
  unit_price: 185_000,
  stock_quantity: 4,
  ...overrides,
})

beforeEach(() => {
  localStorage.clear()
})

describe('adding', () => {
  it('puts a new item in an empty cart', () => {
    addToCart(item())
    expect(getCart()).toHaveLength(1)
    expect(getCart()[0].product_name).toBe('Emerald Velvet Sofa')
  })

  it('increments rather than duplicating an item already in the cart', () => {
    addToCart(item({ quantity: 1 }))
    addToCart(item({ quantity: 2 }))

    const cart = getCart()
    expect(cart).toHaveLength(1)
    expect(cart[0].quantity).toBe(3)
  })

  it('will not take more than there is in stock', () => {
    addToCart(item({ quantity: 10, stock_quantity: 4 }))
    expect(getCart()[0].quantity).toBe(4)
  })

  it('will not exceed stock across separate additions either', () => {
    addToCart(item({ quantity: 3, stock_quantity: 4 }))
    addToCart(item({ quantity: 3, stock_quantity: 4 }))
    expect(getCart()[0].quantity).toBe(4)
  })

  it('keeps different products apart', () => {
    addToCart(item({ product_id: 1 }))
    addToCart(item({ product_id: 2, product_name: 'Verona Wardrobe' }))
    expect(getCart()).toHaveLength(2)
  })
})

describe('changing quantity', () => {
  it('updates the quantity of one item', () => {
    addToCart(item())
    updateCartItemQuantity(1, 3)
    expect(getCartItem(1)?.quantity).toBe(3)
  })

  it('removes the item when the quantity reaches zero', () => {
    addToCart(item())
    updateCartItemQuantity(1, 0)
    expect(getCart()).toHaveLength(0)
  })

  it('caps an update at the stock on hand', () => {
    addToCart(item({ stock_quantity: 4 }))
    updateCartItemQuantity(1, 99)
    expect(getCartItem(1)?.quantity).toBe(4)
  })
})

describe('removing and clearing', () => {
  it('removes only the named product', () => {
    addToCart(item({ product_id: 1 }))
    addToCart(item({ product_id: 2 }))
    removeFromCart(1)

    expect(getCart()).toHaveLength(1)
    expect(getCart()[0].product_id).toBe(2)
  })

  it('empties the cart', () => {
    addToCart(item())
    clearCart()
    expect(getCart()).toHaveLength(0)
  })
})

describe('totals', () => {
  it('sums quantity and money across items', () => {
    addToCart(item({ product_id: 1, quantity: 2, unit_price: 185_000, stock_quantity: 9 }))
    addToCart(item({ product_id: 2, quantity: 1, unit_price: 312_000, stock_quantity: 9 }))

    const { itemCount, subtotal } = getCartTotal()
    expect(itemCount).toBe(3)
    expect(subtotal).toBe(682_000)
  })

  it('counts units, not lines', () => {
    addToCart(item({ quantity: 3, stock_quantity: 9 }))
    expect(getCartItemCount()).toBe(3)
  })

  it('reports zero for an empty cart rather than throwing', () => {
    expect(getCartTotal()).toEqual({ itemCount: 0, subtotal: 0 })
  })
})

describe('reading a corrupted cart', () => {
  it('returns empty rather than throwing when storage holds nonsense', () => {
    // The code under test logs, correctly. Silence it so a passing run does
    // not print a stack trace that reads like a failure.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    localStorage.setItem('shopping_cart', '{not json')
    expect(getCart()).toEqual([])
  })
})

describe('cross-tab sync', () => {
  it('announces a change so other views can pick it up', () => {
    let heard = false
    const listen = () => {
      heard = true
    }
    window.addEventListener('cart-updated', listen)
    saveCart([item()])
    window.removeEventListener('cart-updated', listen)

    expect(heard).toBe(true)
  })
})

describe('membership', () => {
  it('knows what is in the cart', () => {
    addToCart(item({ product_id: 7 }))
    expect(isInCart(7)).toBe(true)
    expect(isInCart(8)).toBe(false)
  })
})
