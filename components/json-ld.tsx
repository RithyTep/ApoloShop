/**
 * JSON-LD Structured Data Components
 * Provides SEO-friendly structured data for search engines
 */

interface JsonLdProps {
  data: Record<string, unknown>
}

/**
 * Generic JSON-LD component that renders structured data
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

interface ProductJsonLdComponentProps {
  product: {
    name: string
    description?: string
    image?: string
    sku: string
    price: number
    priceCurrency: 'USD' | 'KHR'
    inStock: boolean
    url: string
    category?: string
    rating?: {
      value: number
      count: number
    }
  }
  shopName?: string
}

/**
 * Product-specific JSON-LD component
 */
export function ProductJsonLd({ product, shopName }: ProductJsonLdComponentProps) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.sku,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.priceCurrency,
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: product.url,
    },
  }

  if (product.description) {
    data.description = product.description
  }

  if (product.image) {
    data.image = product.image
  }

  if (shopName) {
    data.brand = {
      '@type': 'Brand',
      name: shopName,
    }
  }

  if (product.category) {
    data.category = product.category
  }

  if (product.rating && product.rating.count > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating.value.toFixed(1),
      reviewCount: product.rating.count,
      bestRating: 5,
      worstRating: 1,
    }
  }

  return <JsonLd data={data} />
}

interface OrganizationJsonLdComponentProps {
  name: string
  url: string
  logo?: string
  description?: string
  socialLinks?: {
    facebook?: string
    instagram?: string
    telegram?: string
  }
}

/**
 * Organization JSON-LD component for shop/brand info
 */
export function OrganizationJsonLd({
  name,
  url,
  logo,
  description,
  socialLinks,
}: OrganizationJsonLdComponentProps) {
  const sameAs: string[] = []
  if (socialLinks?.facebook) sameAs.push(socialLinks.facebook)
  if (socialLinks?.instagram) sameAs.push(socialLinks.instagram)
  if (socialLinks?.telegram) sameAs.push(socialLinks.telegram)

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
  }

  if (logo) {
    data.logo = logo
  }

  if (description) {
    data.description = description
  }

  if (sameAs.length > 0) {
    data.sameAs = sameAs
  }

  return <JsonLd data={data} />
}

interface BreadcrumbJsonLdComponentProps {
  items: Array<{
    name: string
    url: string
  }>
}

/**
 * Breadcrumb JSON-LD component for navigation
 */
export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdComponentProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return <JsonLd data={data} />
}

interface WebsiteJsonLdComponentProps {
  name: string
  url: string
  description?: string
  searchUrl?: string
}

/**
 * WebSite JSON-LD component with optional search action
 */
export function WebsiteJsonLd({
  name,
  url,
  description,
  searchUrl,
}: WebsiteJsonLdComponentProps) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
  }

  if (description) {
    data.description = description
  }

  if (searchUrl) {
    data.potentialAction = {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: searchUrl,
      },
      'query-input': 'required name=search_term_string',
    }
  }

  return <JsonLd data={data} />
}

interface LocalBusinessJsonLdComponentProps {
  name: string
  description?: string
  url: string
  telephone?: string
  address?: {
    street?: string
    city?: string
    country?: string
    postalCode?: string
  }
  geo?: {
    latitude: number
    longitude: number
  }
  priceRange?: string
  image?: string
}

/**
 * LocalBusiness JSON-LD component for physical stores
 */
export function LocalBusinessJsonLd({
  name,
  description,
  url,
  telephone,
  address,
  geo,
  priceRange,
  image,
}: LocalBusinessJsonLdComponentProps) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name,
    url,
  }

  if (description) {
    data.description = description
  }

  if (telephone) {
    data.telephone = telephone
  }

  if (address) {
    data.address = {
      '@type': 'PostalAddress',
      ...(address.street && { streetAddress: address.street }),
      ...(address.city && { addressLocality: address.city }),
      ...(address.country && { addressCountry: address.country }),
      ...(address.postalCode && { postalCode: address.postalCode }),
    }
  }

  if (geo) {
    data.geo = {
      '@type': 'GeoCoordinates',
      latitude: geo.latitude,
      longitude: geo.longitude,
    }
  }

  if (priceRange) {
    data.priceRange = priceRange
  }

  if (image) {
    data.image = image
  }

  return <JsonLd data={data} />
}
