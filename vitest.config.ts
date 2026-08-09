import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

/**
 * Tests read the same environment the app does.
 *
 * Vitest does not load .env.local; Next does. That difference let a currency
 * test assert "no dollar sign" and pass, while the running shop displayed
 * $168,000 — because .env.local carried NEXT_PUBLIC_CURRENCY=USD and the test
 * only ever saw the PKR default in the code. The test was green and the
 * screen was wrong, which is worse than having no test at all.
 */
const env = loadEnv('test', process.cwd(), '')

export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom rather than node, because the tests that matter here are about
    // what happens when someone uses the thing: whether adding to the cart
    // adds to the cart, whether an invalid checkout actually stops. The
    // design-system tests are pure and do not care either way.
    environment: 'jsdom',
    globals: true,
    env,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],

    /**
     * Fifteen seconds, not the default five.
     *
     * Most of these tests are pure and finish in single-digit milliseconds,
     * but the order tests talk to a real Postgres in Mumbai -- that is the
     * point of them -- and each assertion is a round trip. Under the load of
     * `npm run verify`, which is building the application at the same time,
     * one of them crossed five seconds and the whole gate failed on a test
     * that had found nothing wrong.
     *
     * A gate that fails at random is worse than no gate: people learn to
     * re-run it rather than read it.
     */
    testTimeout: 15_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // See the note in the stub: the real package throws under jsdom.
      'server-only': path.resolve(__dirname, './src/test/server-only-stub.ts'),
    },
  },
})
