/**
 * Who charges tax, and how much.
 *
 * Two different answers for two different counters:
 *
 *   - The online shop charges none. A price on the website is the price the
 *     customer pays, and adding a percentage at the last step of checkout is
 *     the single most common reason a full basket is abandoned.
 *
 *   - The counter charges whatever the owner decides on the day. A walk-in
 *     might be a cash sale with no tax, a trade customer might need it on
 *     the bill; that is a decision for the person holding the till, not a
 *     constant compiled into the app.
 *
 * This used to be one hardcoded 18% applied to both, read from an
 * environment variable that nobody could change without a redeploy.
 */

/**
 * The online shop's rate. Zero, and not configurable.
 *
 * A named constant rather than a bare `0` at the call sites, so the intent
 * survives: somebody reading `tax: 0` in the orders route would reasonably
 * wonder whether it was a stub waiting to be finished.
 */
export const ONLINE_TAX_RATE = 0

/**
 * What the till may charge, as fractions.
 *
 * A fixed list rather than a free number field. A cashier in a hurry can
 * type 18 where they meant 1.8, and nothing downstream would question it --
 * a wrong rate on a printed bill is the shop's problem for as long as the
 * customer keeps the paper.
 */
export const COUNTER_TAX_RATES = [0, 0.05, 0.1, 0.18] as const

export type CounterTaxRate = (typeof COUNTER_TAX_RATES)[number]

/** What the till opens on. No tax unless somebody chooses otherwise. */
export const DEFAULT_COUNTER_TAX_RATE: CounterTaxRate = 0

/**
 * Rounded to the paisa.
 *
 * 5% of Rs 26,500 is 1325 exactly, but 5% of Rs 26,533 is 1326.65 and the
 * float underneath is 1326.6500000000001. Left unrounded that reaches the
 * database as the stored tax, and the receipt's own arithmetic stops adding
 * up in the last decimal place.
 */
export const taxOn = (subtotal: number, rate: number): number =>
  Math.round(subtotal * rate * 100) / 100

/** `0.05` to `5%`, and zero to something a person would say out loud. */
export const formatTaxRate = (rate: number): string =>
  rate <= 0 ? 'No tax' : `${Number((rate * 100).toFixed(2))}%`

/** The label for a totals row: "Tax (5%)". */
export const taxRowLabel = (rate: number): string =>
  rate <= 0 ? 'Tax' : `Tax (${formatTaxRate(rate)})`

/**
 * How much tax a posted counter sale actually carries.
 *
 * Exists as its own function purely so the zero case can be tested. Inline
 * this was written `body.tax || taxOn(...)`, and once the till gained a
 * "None" setting that `||` treated the resulting `tax: 0` as absent and fell
 * through to the default rate -- silently adding tax to the one kind of sale
 * the new setting was built to allow. Only a genuinely missing field falls
 * back; a zero somebody chose is an answer.
 */
export const resolveCounterTax = (posted: unknown, subtotal: number): number => {
  if (posted === null || posted === undefined) {
    return taxOn(subtotal, DEFAULT_COUNTER_TAX_RATE)
  }
  const amount = Number(posted)
  return Number.isFinite(amount) && amount >= 0
    ? amount
    : taxOn(subtotal, DEFAULT_COUNTER_TAX_RATE)
}

/**
 * Accepts only a rate the till is allowed to charge.
 *
 * The chosen rate is remembered in the browser between sales, and anything
 * that round-trips through storage can come back as a string, a stale value
 * from an older build, or whatever somebody typed into devtools.
 */
export const asCounterTaxRate = (value: unknown): CounterTaxRate => {
  const rate = Number(value)
  return (COUNTER_TAX_RATES as readonly number[]).includes(rate)
    ? (rate as CounterTaxRate)
    : DEFAULT_COUNTER_TAX_RATE
}
