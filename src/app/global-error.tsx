'use client'

/**
 * Last-resort boundary, for a failure in the root layout itself.
 *
 * This replaces `<html>` and `<body>`, so none of the app's providers, fonts
 * or stylesheets are available — every style here has to be inline. Keep it
 * dependency-free for exactly that reason.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FAF8F5',
          color: '#221E19',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '2rem',
        }}
      >
        <div style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.75rem', margin: '0 0 0.75rem', fontWeight: 600 }}>
            VEMCO is temporarily unavailable
          </h1>
          <p style={{ margin: '0 0 1.5rem', color: '#5C5343', lineHeight: 1.6 }}>
            Something failed at the root of the application. Reloading may resolve it.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '0.375rem',
              border: 'none',
              background: '#9E6728',
              color: '#fff',
              fontSize: '0.9375rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
          {error.digest && (
            <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: '#786D5F' }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
