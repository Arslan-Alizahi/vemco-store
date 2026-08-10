import { ImageResponse } from 'next/og'
import { bark, semantic } from '@/design/tokens'
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand'
import { SITE_DESCRIPTION } from '@/lib/site'

export const runtime = 'edge'
export const alt = `${BRAND_NAME} — ${BRAND_TAGLINE}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * Share card, generated at request time.
 *
 * Every shared link previously rendered as a blank card. Drawn rather than
 * shipped as a PNG so it stays on the design tokens automatically — which
 * only works if it actually reads them. The values were pasted in as hex on
 * the assumption the edge runtime could not import the module; it can, since
 * tokens.ts is plain constants. Two of the pasted values had already drifted
 * a shade off the real ones by the time anyone checked.
 */
export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: semantic['surface-inverse'],
          padding: '72px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* The wordmark, set the way the site sets it: letterspaced caps,
            no glyph. The card used to lead with a plain caramel square, which
            was a placeholder for a logo that never existed and the only amber
            left anywhere in the brand. */}
        <span
          style={{
            color: bark[300],
            fontSize: 26,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          {BRAND_NAME}
        </span>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              color: semantic.canvas,
              fontSize: 78,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              maxWidth: 900,
            }}
          >
            {BRAND_TAGLINE}
          </span>
          <span style={{ color: bark[300], fontSize: 28, marginTop: 26, maxWidth: 940 }}>
            {SITE_DESCRIPTION}
          </span>
        </div>
      </div>
    ),
    size
  )
}
