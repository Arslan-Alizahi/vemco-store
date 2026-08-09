import { ImageResponse } from 'next/og'
import { bark, caramel, semantic } from '@/design/tokens'

export const runtime = 'edge'
export const alt = 'Vimco Furniture House — Furniture for considered spaces'
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
          background: bark[900],
          padding: '72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 13,
              background: caramel[600],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
          <span style={{ color: semantic.canvas, fontSize: 34, letterSpacing: '-0.01em' }}>Vimco Furniture House</span>
        </div>

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
            Furniture for considered spaces
          </span>
          <span style={{ color: bark[400], fontSize: 30, marginTop: 26 }}>
            Solid wood, honest joinery, delivered across Pakistan
          </span>
        </div>
      </div>
    ),
    size
  )
}
