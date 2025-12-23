import { Metadata } from "next"
import { getShopCustomization, getProducts } from "@/lib/server-utils"
import { ShopClientWrapper } from "@/components/shop/shop-client-wrapper"
import { ProductsSection } from "@/components/shop/products-section"
import { HeroSection } from "@/components/shop/hero-section"
import { PromotionsSection } from "@/components/shop/promotions-section"
import { FooterSection } from "@/components/shop/footer-section"
import type {
  HeroConfig,
  PromotionsConfig,
  ProductsConfig,
  FooterConfig,
} from "@/lib/api-hooks"

// Generate dynamic SEO metadata
export async function generateMetadata(): Promise<Metadata> {
  const customization = await getShopCustomization()
  const shopName = customization.theme?.shopName || "Shop"

  return {
    title: shopName,
    description: `Welcome to ${shopName}. Discover our amazing products.`,
    openGraph: {
      title: shopName,
      description: `Shop at ${shopName} - Browse our products`,
      type: "website",
    },
  }
}

// Revalidate every 60 seconds for near-static behavior
export const revalidate = 60

export default async function ShopPage() {
  // Fetch data on server
  const [customization, products] = await Promise.all([
    getShopCustomization(),
    getProducts(),
  ])

  const { theme, sections } = customization

  // Sort and filter enabled sections
  const sortedSections = sections
    ?.filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order) || []

  return (
    <ShopClientWrapper theme={theme} products={products}>
      <main className="pt-20">
        {sortedSections.length > 0 ? (
          sortedSections.map((section) => {
            switch (section.type) {
              case "hero":
                return (
                  <HeroSection
                    key={section.id}
                    config={section.config as HeroConfig}
                  />
                )
              case "promotions":
                return (
                  <PromotionsSection
                    key={section.id}
                    config={section.config as PromotionsConfig}
                  />
                )
              case "products":
                return (
                  <ProductsSection
                    key={section.id}
                    config={section.config as ProductsConfig}
                    initialProducts={products}
                  />
                )
              case "footer":
                return (
                  <FooterSection
                    key={section.id}
                    config={section.config as FooterConfig}
                  />
                )
              default:
                return null
            }
          })
        ) : (
          // Fallback to default products section if no customization
          <ProductsSection
            config={{
              titleEn: "Our Products",
              titleKh: "ផលិតផលរបស់យើង",
              displayType: "featured",
              layout: "grid",
              columns: 4,
              maxProducts: 12,
              showPrice: true,
              showStock: true,
              showAddToCart: true,
            }}
            initialProducts={products}
          />
        )}
      </main>
    </ShopClientWrapper>
  )
}
