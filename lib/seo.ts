/**
 * SEO Utility Functions
 * Provides slug generation, JSON-LD structured data, and metadata helpers
 */

// ============================================
// SLUG GENERATION
// ============================================

/**
 * Generates a URL-friendly slug from a string
 * @param text - The text to convert to a slug
 * @returns URL-friendly slug string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Replace Khmer and other non-ASCII characters with empty string
    .replace(/[^\x00-\x7F]/g, '')
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove special characters except hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Replace multiple hyphens with single hyphen
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-|-$/g, '')
    // Limit length for URL friendliness
    .slice(0, 100)
}

/**
 * Generates a unique slug by appending a counter if necessary
 * @param baseSlug - The base slug
 * @param existingSlugs - Array of existing slugs to check against
 * @returns Unique slug string
 */
export function generateUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  let slug = baseSlug
  let counter = 1

  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  return slug
}

// ============================================
// JSON-LD STRUCTURED DATA
// ============================================

export interface ProductJsonLdProps {
  name: string
  description?: string
  image?: string
  sku: string
  price: number
  priceCurrency: 'USD' | 'KHR'
  availability: 'InStock' | 'OutOfStock' | 'PreOrder'
  url: string
  brand?: string
  category?: string
  rating?: {
    value: number
    count: number
  }
}

/**
 * Generates Product JSON-LD structured data for SEO
 */
export function generateProductJsonLd(props: ProductJsonLdProps) {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: props.name,
    sku: props.sku,
    offers: {
      '@type': 'Offer',
      price: props.price,
      priceCurrency: props.priceCurrency,
      availability: `https://schema.org/${props.availability}`,
      url: props.url,
    },
  }

  if (props.description) {
    jsonLd.description = props.description
  }

  if (props.image) {
    jsonLd.image = props.image
  }

  if (props.brand) {
    jsonLd.brand = {
      '@type': 'Brand',
      name: props.brand,
    }
  }

  if (props.category) {
    jsonLd.category = props.category
  }

  if (props.rating && props.rating.count > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: props.rating.value,
      reviewCount: props.rating.count,
      bestRating: 5,
      worstRating: 1,
    }
  }

  return jsonLd
}

export interface OrganizationJsonLdProps {
  name: string
  url: string
  logo?: string
  description?: string
  contactPhone?: string
  contactEmail?: string
  socialLinks?: {
    facebook?: string
    instagram?: string
    telegram?: string
  }
}

/**
 * Generates Organization JSON-LD structured data
 */
export function generateOrganizationJsonLd(props: OrganizationJsonLdProps) {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: props.name,
    url: props.url,
  }

  if (props.logo) {
    jsonLd.logo = props.logo
  }

  if (props.description) {
    jsonLd.description = props.description
  }

  const sameAs: string[] = []
  if (props.socialLinks?.facebook) sameAs.push(props.socialLinks.facebook)
  if (props.socialLinks?.instagram) sameAs.push(props.socialLinks.instagram)
  if (props.socialLinks?.telegram) sameAs.push(props.socialLinks.telegram)

  if (sameAs.length > 0) {
    jsonLd.sameAs = sameAs
  }

  if (props.contactPhone || props.contactEmail) {
    jsonLd.contactPoint = {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      ...(props.contactPhone && { telephone: props.contactPhone }),
      ...(props.contactEmail && { email: props.contactEmail }),
    }
  }

  return jsonLd
}

export interface BreadcrumbJsonLdProps {
  items: Array<{
    name: string
    url: string
  }>
}

/**
 * Generates BreadcrumbList JSON-LD structured data
 */
export function generateBreadcrumbJsonLd(props: BreadcrumbJsonLdProps) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: props.items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export interface WebsiteJsonLdProps {
  name: string
  url: string
  description?: string
  searchUrl?: string // URL with {search_term_string} placeholder
}

/**
 * Generates WebSite JSON-LD structured data with optional search action
 */
export function generateWebsiteJsonLd(props: WebsiteJsonLdProps) {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: props.name,
    url: props.url,
  }

  if (props.description) {
    jsonLd.description = props.description
  }

  if (props.searchUrl) {
    jsonLd.potentialAction = {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: props.searchUrl,
      },
      'query-input': 'required name=search_term_string',
    }
  }

  return jsonLd
}

// ============================================
// METADATA HELPERS
// ============================================

export interface SeoMetadata {
  title: string
  description: string
  keywords?: string[]
  openGraph?: {
    title?: string
    description?: string
    type?: 'website' | 'article' | 'product'
    images?: Array<{
      url: string
      width?: number
      height?: number
      alt?: string
    }>
  }
  twitter?: {
    card?: 'summary' | 'summary_large_image'
    title?: string
    description?: string
    image?: string
  }
  canonical?: string
  alternates?: {
    languages?: Record<string, string>
  }
}

/**
 * Generates Next.js Metadata object from SEO configuration
 */
export function generateMetadataFromSeo(seo: SeoMetadata, baseUrl: string) {
  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    openGraph: {
      title: seo.openGraph?.title || seo.title,
      description: seo.openGraph?.description || seo.description,
      type: seo.openGraph?.type || 'website',
      images: seo.openGraph?.images,
      url: seo.canonical || baseUrl,
    },
    twitter: {
      card: seo.twitter?.card || 'summary_large_image',
      title: seo.twitter?.title || seo.title,
      description: seo.twitter?.description || seo.description,
      images: seo.twitter?.image ? [seo.twitter.image] : undefined,
    },
    alternates: {
      canonical: seo.canonical || baseUrl,
      languages: seo.alternates?.languages,
    },
  }
}

/**
 * Truncates text to a maximum length for meta descriptions
 * @param text - The text to truncate
 * @param maxLength - Maximum length (default 160 for meta descriptions)
 */
export function truncateForMeta(text: string, maxLength: number = 160): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3).trim() + '...'
}

// ============================================
// URL HELPERS
// ============================================

/**
 * Gets the base URL from environment or request
 */
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'http://localhost:3000'
}

/**
 * Generates canonical URL for a path
 */
export function getCanonicalUrl(path: string): string {
  const baseUrl = getBaseUrl()
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}

/**
 * Generates product URL using slug or ID fallback
 */
export function getProductUrl(product: { id: string; slug?: string | null }): string {
  const path = product.slug
    ? `/shop/product/${product.slug}`
    : `/shop/product/${product.id}`
  return getCanonicalUrl(path)
}

/**
 * Generates category URL using slug
 */
export function getCategoryUrl(category: { slug: string }): string {
  return getCanonicalUrl(`/shop/products?category=${category.slug}`)
}
