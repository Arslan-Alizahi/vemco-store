import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom rather than node, because the tests that matter here are about
    // what happens when someone uses the thing: whether adding to the cart
    // adds to the cart, whether an invalid checkout actually stops. The
    // design-system tests are pure and do not care either way.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
