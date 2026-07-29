/**
 * The shop's currency, in one place.
 *
 * It was in three: `formatCurrency` printed PKR, and the Stripe integration
 * hardcoded `'usd'` in three separate spots while multiplying a rupee total by
 * 100. A Rs 185,000 sofa was therefore sent to Stripe as 18,500,000 cents of
 * US dollars -- roughly $185,000, about two hundred and eighty times the
 * intended charge, on the first real order anyone placed.
 *
 * Nothing here should be duplicated. If a number needs a currency, it comes
 * from this file.
 */

/** ISO 4217, lowercase for Stripe. Override per deployment. */
export const CURRENCY = (process.env.NEXT_PUBLIC_CURRENCY || 'PKR').toUpperCase()

/** Locale used for grouping and symbol placement. */
export const CURRENCY_LOCALE = process.env.NEXT_PUBLIC_CURRENCY_LOCALE || 'en-PK'

/**
 * Currencies Stripe treats as having no minor unit. For everything else the
 * amount is multiplied by 100. PKR is a two-decimal currency to Stripe, so it
 * is not in this list.
 *
 * https://docs.stripe.com/currencies#zero-decimal
 */
const ZERO_DECIMAL = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA',
  'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
])

/**
 * A shop amount converted to the integer minor unit Stripe expects.
 *
 * Stripe rejects fractional amounts, so this rounds -- and it must round the
 * same way the customer-facing total does, or the price shown and the price
 * charged drift apart by a rupee.
 */
export const toStripeAmount = (amount: number): number =>
  ZERO_DECIMAL.has(CURRENCY) ? Math.round(amount) : Math.round(amount * 100)

/** The inverse, for reading an amount back off a Stripe object. */
export const fromStripeAmount = (amount: number): number =>
  ZERO_DECIMAL.has(CURRENCY) ? amount : amount / 100

/** Stripe wants the code lowercased. */
export const stripeCurrency = (): string => CURRENCY.toLowerCase()
