import { Metadata } from "next"
import { getShopCustomization, getProducts, getCategories } from "@/lib/server-utils"
import { ProductsPageClient } from "@/components/shop/products-page-client"

export async function generateMetadata(): Promise<Metadata> {
  const customization = await getShopCustomization()
  const shopName = customization.theme?.shopName || "Shop"

  return {
    title: `Products | ${shopName}`,
    description: `Browse all products at ${shopName}. Filter by category, price, and more.`,
    openGraph: {
      title: `Products | ${shopName}`,
      description: `Shop all products at ${shopName}`,
      type: "website",
    },
  }
}

export const revalidate = 60

export default async function ProductsPage() {
  const [customization, productsData, categoriesData] = await Promise.all([
    getShopCustomization(),
    getProducts(),
    getCategories(),
  ])

  const { theme } = customization
  const products = productsData.filter((p) => p.isActive)
  const categories = categoriesData.filter((c) => c.isActive)

  // Calculate max price for filter range
  const maxPrice = Math.ceil(
    Math.max(...products.map((p) => Number(p.priceUsd)), 100)
  )

  return (
    <ProductsPageClient
      theme={theme}
      initialProducts={products}
      categories={categories}
      maxPrice={maxPrice}
    />
  )
}
