import type { MetadataRoute } from 'next'
import { bark, caramel } from '@/design/tokens'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vimo Furniture House',
    short_name: 'Vimo Furniture House',
    description: 'Furniture for considered spaces.',
    start_url: '/',
    display: 'standalone',
    background_color: bark[50],
    theme_color: caramel[600],
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  }
}
