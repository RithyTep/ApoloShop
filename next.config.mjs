/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Use unoptimized for external images - R2 already has Cloudflare CDN caching
    unoptimized: true,
  },
}
export default nextConfig
