/**
 * What "today" means to the shop.
 *
 * Every timestamp is stored as TIMESTAMPTZ, which is to say in UTC with an
 * offset. That is the right way to store an instant and the wrong way to
 * answer "how much did we take today", because Postgres reads bare
 * CURRENT_DATE in the session's timezone -- UTC on Supabase.
 *
 * For a shop in Lahore that is five hours out. A sale rung up at 2am on the
 * 9th is 9pm on the 8th in UTC, so it would be counted against yesterday; and
 * for the first five hours of every day the "today" figure would show the
 * previous day's takings still accumulating. The same was true under SQLite,
 * where DATE('now') was also UTC -- it simply went unnoticed because nobody
 * was reconciling the till at midnight.
 *
 * Set SHOP_TIMEZONE if the shop trades somewhere else. It must be a name from
 * the IANA database, not an offset, so daylight saving is handled where it
 * applies.
 */
export const SHOP_TIMEZONE = process.env.SHOP_TIMEZONE || 'Asia/Karachi'

/**
 * A SQL expression for a stored timestamp as a calendar date in the shop's
 * own day.
 *
 * The timezone is interpolated rather than parameterised because it is a
 * server-side constant, never anything a request supplies -- and Postgres
 * will not take a placeholder in an AT TIME ZONE clause.
 */
export const localDate = (column: string): string =>
  `((${column}) AT TIME ZONE '${SHOP_TIMEZONE}')::date`

/** The same, truncated to a month or a year, for period comparisons. */
export const localTrunc = (unit: 'month' | 'year', column: string): string =>
  `date_trunc('${unit}', (${column}) AT TIME ZONE '${SHOP_TIMEZONE}')`

/** Right now, in the shop's day. */
export const NOW_LOCAL = `(NOW() AT TIME ZONE '${SHOP_TIMEZONE}')`
