/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Use unoptimized for external images - R2 already has Cloudflare CDN caching
    unoptimized: true,
  },
  // Fix Prisma client-side bundling issue - keep Prisma on server only
  serverExternalPackages: ['@prisma/client', 'prisma'],
}
export default nextConfig
