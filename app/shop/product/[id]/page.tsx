import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getShopCustomization, getProductByIdOrSlug } from "@/lib/server-utils"
import { getBaseUrl, getCanonicalUrl, truncateForMeta } from "@/lib/seo"
import { ProductDetailClient, ProductNotFound } from "@/components/product-detail-client"
import { ProductJsonLd, BreadcrumbJsonLd } from "@/components/json-ld"

interface ProductPageProps {
  params: Promise<{ id: string }>
}

// Generate dynamic SEO metadata for product pages
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params
  const [product, customization] = await Promise.all([
    getProductByIdOrSlug(id),
    getShopCustomization(),
  ])

  if (!product) {
    return {
      title: "Product Not Found",
      description: "The product you're looking for doesn't exist or has been removed.",
    }
  }

  const shopName = customization.theme?.shopName || "Shop"
  const baseUrl = getBaseUrl()
  const productUrl = product.slug
    ? `${baseUrl}/shop/product/${product.slug}`
    : `${baseUrl}/shop/product/${product.id}`

  // Build meta description from product description or name
  const description = product.descriptionEn
    ? truncateForMeta(product.descriptionEn, 160)
    : `${product.nameEn} - Available at ${shopName}. Price: $${product.priceUsd.toFixed(2)}`

  return {
    title: `${product.nameEn} | ${shopName}`,
    description,
    keywords: [
      product.nameEn,
      product.category?.nameEn || '',
      shopName,
      'buy online',
      'Cambodia',
    ].filter(Boolean),
    openGraph: {
      title: `${product.nameEn} | ${shopName}`,
      description,
      type: "website",
      url: productUrl,
      images: product.imageUrl
        ? [
            {
              url: product.imageUrl,
              width: 800,
              height: 800,
              alt: product.nameEn,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.nameEn,
      description,
      images: product.imageUrl ? [product.imageUrl] : undefined,
    },
    alternates: {
      canonical: productUrl,
    },
  }
}

// Revalidate every 60 seconds for near-static behavior
export const revalidate = 60

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params
  const [product, customization] = await Promise.all([
    getProductByIdOrSlug(id),
    getShopCustomization(),
  ])

  if (!product) {
    return <ProductNotFound />
  }

  const shopName = customization.theme?.shopName || "Shop"
  const baseUrl = getBaseUrl()
  const productUrl = product.slug
    ? `${baseUrl}/shop/product/${product.slug}`
    : `${baseUrl}/shop/product/${product.id}`

  // Determine stock status
  const inStock = product.inventory ? product.inventory.quantity > 0 : true

  // Get review stats from product
  const productWithStats = product as typeof product & { _reviewStats?: { averageRating: number; totalReviews: number } }

  return (
    <>
      {/* JSON-LD Structured Data for Product */}
      <ProductJsonLd
        product={{
          name: product.nameEn,
          description: product.descriptionEn,
          image: product.imageUrl,
          sku: product.sku,
          price: product.priceUsd,
          priceCurrency: "USD",
          inStock,
          url: productUrl,
          category: product.category?.nameEn,
          rating: productWithStats._reviewStats
            ? {
                value: productWithStats._reviewStats.averageRating,
                count: productWithStats._reviewStats.totalReviews,
              }
            : undefined,
        }}
        shopName={shopName}
      />

      {/* JSON-LD Breadcrumb for navigation */}
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          { name: "Shop", url: `${baseUrl}/shop` },
          ...(product.category
            ? [
                {
                  name: product.category.nameEn,
                  url: `${baseUrl}/shop/products?category=${product.category.slug}`,
                },
              ]
            : []),
          { name: product.nameEn, url: productUrl },
        ]}
      />

      {/* Client-side product detail component */}
      <ProductDetailClient product={productWithStats} />
    </>
  )
}
