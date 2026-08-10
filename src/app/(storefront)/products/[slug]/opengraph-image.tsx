import { ImageResponse } from 'next/og'
import { bark, semantic } from '@/design/tokens'
import { BRAND_NAME } from '@/lib/brand'
import { SITE_URL, absoluteUrl } from '@/lib/site'

/**
 * The card that appears when somebody shares a piece.
 *
 * Drawn rather than handing over the raw photograph, for two reasons. The
 * shop's product shots are portrait -- 1200x1500 -- and every platform crops
 * a share preview to roughly 1.91:1, so the raw file arrives with its top and
 * bottom cut off. And a preview carrying the name and the price is a
 * different thing from one carrying a picture: whoever receives it on
 * WhatsApp can decide whether they are interested without opening anything.
 *
 * Edge, with the product read over the shop's own public API rather than
 * straight from the database. The node runtime would allow the direct query,
 * but @vercel/og cannot be imported under it on Windows -- it resolves its
 * bundled font with fileURLToPath and throws ERR_INVALID_URL at import time,
 * so the card would work in production and 500 in local development. A page
 * that can only be tested by deploying it is a page nobody tests.
 */
export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = `Furniture from ${BRAND_NAME}`

const money = (amount: number) => `Rs ${Math.round(amount).toLocaleString('en-PK')}`

/**
 * A format the card renderer can actually decode.
 *
 * satori reads PNG and JPEG. The site serves WebP and AVIF because they are
 * a third of the weight in a browser, and handing either to the card produced
 * a perfectly typeset panel beside an empty grey rectangle -- the one part of
 * the preview the whole thing exists for. Every image in this shop is written
 * out in all three formats side by side, so the JPEG is a filename away.
 *
 * If it is not there, the card renders without a photograph rather than
 * failing: a name and a price still beats a broken link.
 */
const decodableImage = (url: string) => url.replace(/\.(webp|avif)$/i, '.jpg')

interface ApiProduct {
  name?: string
  price?: number
  primary_image?: string | null
  images?: { image_url: string }[]
}

export default async function ProductOpengraphImage({
  params,
}: {
  params: { slug: string }
}) {
  let name = BRAND_NAME
  let price: number | null = null
  let photo: string | null = null

  /**
   * A share card must render whatever happens.
   *
   * If the catalogue cannot be reached the card falls back to the shop's own
   * name on the brand colours -- worse than the real thing, and far better
   * than the blank rectangle a thrown error produces. A scraper gets one
   * attempt at this and does not come back.
   */
  try {
    const response = await fetch(`${SITE_URL}/api/products/slug/${params.slug}`, {
      next: { revalidate: 300 },
    })

    if (response.ok) {
      const product = (await response.json()) as ApiProduct
      if (product?.name) name = product.name
      if (typeof product?.price === 'number') price = product.price

      /**
       * The last image, not the first.
       *
       * The first is flagged primary because it is the thumbnail the grid
       * uses, and here that is the 600px variant -- right on a card inside a
       * page, and half the resolution a share preview wants.
       */
      const candidate =
        product?.images?.[product.images.length - 1]?.image_url ||
        product?.primary_image ||
        null
      if (candidate) {
        const usable = decodableImage(candidate)
        photo = usable.startsWith('http') ? usable : absoluteUrl(usable)
      }
    }
  } catch (error) {
    console.error('Share card: the catalogue could not be reached:', error)
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: semantic.canvas,
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            width: '46%',
            height: '100%',
            display: 'flex',
            background: bark[200],
          }}
        >
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt=""
              width={552}
              height={630}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
        </div>

        <div
          style={{
            width: '54%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '64px 56px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                color: bark[500],
                fontSize: 22,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              {BRAND_NAME}
            </span>

            <span
              style={{
                color: bark[900],
                // A long name gets a smaller size rather than a clipped card.
                fontSize: name.length > 28 ? 52 : 64,
                lineHeight: 1.06,
                letterSpacing: '-0.02em',
                marginTop: 28,
              }}
            >
              {name}
            </span>

            {price !== null && (
              <span style={{ color: bark[900], fontSize: 44, marginTop: 28 }}>
                {money(price)}
              </span>
            )}
          </div>

          <span style={{ color: bark[500], fontSize: 24 }}>
            Full dimensions listed · Delivered across Pakistan
          </span>
        </div>
      </div>
    ),
    size
  )
}
