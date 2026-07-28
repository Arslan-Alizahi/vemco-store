import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'VEMCO — Furniture for considered spaces'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * Share card, generated at request time.
 *
 * Every shared link previously rendered as a blank card. Drawn rather than
 * shipped as a PNG so it stays on the design tokens automatically — the
 * values here are bark-900, caramel-600 and canvas from src/design/tokens.ts,
 * inlined because the edge runtime cannot import the TS module.
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
          background: '#221E19',
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
              background: '#9E6728',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
          <span style={{ color: '#FAF8F5', fontSize: 34, letterSpacing: '-0.01em' }}>VEMCO</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              color: '#FAF8F5',
              fontSize: 78,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              maxWidth: 900,
            }}
          >
            Furniture for considered spaces
          </span>
          <span style={{ color: '#94897A', fontSize: 30, marginTop: 26 }}>
            Solid wood, honest joinery, delivered across Pakistan
          </span>
        </div>
      </div>
    ),
    size
  )
}
