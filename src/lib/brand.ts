/**
 * The shop's own name, in one place.
 *
 * It was written out as a literal in forty-odd files -- page copy, metadata,
 * three printed documents, the manifest, the OG image -- so renaming the
 * business meant a find-and-replace across the codebase and hoping nothing
 * was missed. A shop can be renamed, sold, or franchised; the name is data,
 * not a constant of the universe.
 */

/** The legal and display name. Titles, footers, printed headers. */
export const BRAND_NAME = 'Vimo Furniture House'

/**
 * The name in running prose after the first mention, and in tight spaces.
 *
 * Three words is too many for a sentence that already has work to do:
 * "Vimo delivers across Pakistan" reads; "Vimo Furniture House delivers
 * across Pakistan" is a press release.
 */
export const BRAND_SHORT = 'Vimo'

/** The wordmark lockup: a large word over a small letterspaced line. */
export const BRAND_MARK = { top: 'VIMO', bottom: 'FURNITURE HOUSE' } as const

export const BRAND_TAGLINE = 'Furniture for considered spaces'

export const BRAND_DOMAIN = 'vimofurniture.pk'

export const contactEmail = (inbox: string) => `${inbox}@${BRAND_DOMAIN}`

export const BRAND_ADDRESS = 'Showroom 14, Gulberg III, Lahore'
export const BRAND_PHONE = '+92 42 3500 0000'
