/**
 * Phone numbers, as strings and nothing else.
 *
 * These live apart from `customers.ts` because that module opens a database
 * connection, and anything importing it drags Postgres into whatever bundle
 * it lands in. The till's booking bill needs to build a WhatsApp link in the
 * browser, and a browser has no `tls` module -- which is exactly how the
 * build broke when these two lived together.
 */

/** Pakistan. Set this per deployment if the shop trades elsewhere. */
const COUNTRY_CODE = process.env.NEXT_PUBLIC_PHONE_COUNTRY_CODE || '92'

/** Digits in a local number after the trunk zero — 300 1234567 is ten. */
const NATIONAL_LENGTH = 10

/**
 * One phone number, one customer, however it was typed.
 *
 * Stripping punctuation is not enough. In Pakistan the leading 0 is a trunk
 * prefix that +92 replaces, so 0300 1234567 and +92 300 1234567 are the same
 * line — and a shop where the cashier types it one way on Monday and the
 * other on Friday would file one person as two, each with half their history.
 * That is the exact failure phone-as-identity exists to prevent.
 *
 * Everything is stored in the local 0-prefixed form, because that is what a
 * customer says out loud and what a cashier reads back.
 */
export const normalisePhone = (phone: string): string => {
  let digits = phone.replace(/\D/g, '')

  // 0092 300 1234567 — the international prefix written out.
  if (digits.startsWith(`00${COUNTRY_CODE}`)) digits = digits.slice(2)

  // 92 300 1234567, from a + that the strip above removed.
  if (digits.startsWith(COUNTRY_CODE) && digits.length === COUNTRY_CODE.length + NATIONAL_LENGTH) {
    digits = digits.slice(COUNTRY_CODE.length)
  }

  // 300 1234567, written without the trunk zero.
  if (digits.length === NATIONAL_LENGTH && !digits.startsWith('0')) digits = `0${digits}`

  return digits
}

/**
 * The same number in the form WhatsApp wants: country code, no plus, no
 * leading zero. 0300 1234567 becomes 923001234567.
 *
 * Returns null rather than guessing when the number is not a full local one.
 * A wa.me link built from half a phone number opens a chat with a stranger,
 * which is worse than no button at all.
 */
export const toInternationalPhone = (phone: string): string | null => {
  const local = normalisePhone(phone)

  if (local.length !== NATIONAL_LENGTH + 1 || !local.startsWith('0')) return null

  return `${COUNTRY_CODE}${local.slice(1)}`
}
