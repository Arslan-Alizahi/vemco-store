import type { MetadataRoute } from 'next'
import { bark, caramel } from '@/design/tokens'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ModernStore',
    short_name: 'ModernStore',
    description: 'Furniture for considered spaces.',
    start_url: '/',
    display: 'standalone',
    background_color: bark[50],
    theme_color: caramel[600],
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  }
}
