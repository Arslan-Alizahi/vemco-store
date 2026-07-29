/**
 * Delivery pricing, in one place.
 *
 * The cart worked these out client-side and sent the result to the order API,
 * which accepted it. Anything a customer can send, a customer can change, so
 * the two now read the same constants and the server recomputes the figure
 * rather than trusting the one it was handed.
 */

/** Above this order value, delivery is free. */
export const FREE_SHIPPING_THRESHOLD = 100_000

/** Flat delivery charge below the threshold. */
export const STANDARD_SHIPPING = 2_500

export const shippingFor = (subtotal: number): number =>
  subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING
