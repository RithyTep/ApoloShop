import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ApoloShop',
    short_name: 'ApoloShop',
    description: 'E-commerce platform for small Cambodian businesses',
    start_url: '/shop',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    orientation: 'portrait-primary',
    categories: ['shopping', 'business'],
    lang: 'en',
    icons: [
      {
        src: '/icons/icon-512x512.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Browse Products',
        short_name: 'Products',
        url: '/shop/products',
      },
      {
        name: 'My Wishlist',
        short_name: 'Wishlist',
        url: '/shop/wishlist',
      },
    ],
  }
}
