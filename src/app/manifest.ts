import type { MetadataRoute } from 'next'
import { forest, stone } from '@/design/tokens'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ModernStore',
    short_name: 'ModernStore',
    description: 'Furniture for considered spaces.',
    start_url: '/',
    display: 'standalone',
    background_color: stone[50],
    theme_color: forest[600],
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  }
}
