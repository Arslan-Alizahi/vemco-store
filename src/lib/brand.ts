/**
 * The shop's own name and contact details, in one place.
 *
 * These were written out as literals in forty-odd files -- page copy,
 * metadata, three printed documents, the manifest, the OG image -- so
 * renaming the business or moving the showroom meant a find-and-replace
 * across the codebase and hoping nothing was missed. A shop can be renamed,
 * relocated, or given a second phone line; that is data, not a constant of
 * the universe.
 */

/** The legal and display name. Titles, footers, printed headers. */
export const BRAND_NAME = 'Vimco Furniture House'

/**
 * The name in running prose after the first mention, and in tight spaces.
 *
 * Three words is too many for a sentence that already has work to do:
 * "Vimco delivers across Pakistan" reads; "Vimco Furniture House delivers
 * across Pakistan" is a press release.
 */
export const BRAND_SHORT = 'Vimco'

/** The wordmark lockup: a large word over a small letterspaced line. */
export const BRAND_MARK = { top: 'VIMCO', bottom: 'FURNITURE HOUSE' } as const

export const BRAND_TAGLINE = 'Furniture for considered spaces'

/**
 * One address, one inbox, two phone lines.
 *
 * The shop previously advertised six invented inboxes -- hello@, support@,
 * press@, careers@, privacy@, access@ -- none of which existed. A published
 * address that bounces is worse than no address: the customer with a problem
 * writes to it, hears nothing, and concludes the shop is ignoring them.
 */
export const BRAND_ADDRESS = 'Dhindhiyan Road, Chohar Shareef Chowk, Haripur, KPK, Pakistan'

/** Both lines, in the order the shop wants them tried. */
export const BRAND_PHONES = ['+92 300 9125757', '+92 300 9181345'] as const

export const BRAND_PHONE = BRAND_PHONES[0]

export const BRAND_EMAIL = 'hj680787@gmail.com'

/**
 * `tel:` needs the digits with no spaces; the page shows the spaced form
 * because that is how a person reads a number back to themselves.
 */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`

/** Address and both numbers on one line, for a printed footer. */
export const BRAND_CONTACT_LINE = `${BRAND_ADDRESS} · ${BRAND_PHONES.join(' · ')} · ${BRAND_EMAIL}`
