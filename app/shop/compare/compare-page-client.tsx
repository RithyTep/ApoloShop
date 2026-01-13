"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, ShoppingBag } from "lucide-react"
import { useCart, useLanguage, useCurrency } from "@/lib/shop-context"
import { ComparisonProvider, useComparison } from "@/lib/comparison-context"
import { ComparisonTable } from "@/components/comparison-table"
import { Product } from "@/lib/api-hooks"
import { translations } from "@/lib/i18n"

interface ComparePageClientProps {
  initialProductIds: string[]
}

function ComparePageContent({ initialProductIds }: ComparePageClientProps) {
  const router = useRouter()
  const { addToCart } = useCart()
  const { language } = useLanguage()
  const { currency } = useCurrency()
  const { compareProducts, addToCompare, clearCompare } = useComparison()
  const [isLoading, setIsLoading] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)

  const t = translations[language === "EN" ? "en" : "kh"]
  const compareT = t.compare || {
    backToShop: language === "EN" ? "Back to Shop" : "ត្រលប់ទៅហាង",
    continueShopping: language === "EN" ? "Continue Shopping" : "បន្តទិញទំនិញ",
    noProducts: language === "EN" ? "No products to compare" : "មិនមានផលិតផលដើម្បីប្រៀបធៀប",
    addProducts:
      language === "EN"
        ? "Add products to compare by clicking the compare button on product cards."
        : "បន្ថែមផលិតផលដើម្បីប្រៀបធៀបដោយចុចប៊ូតុងប្រៀបធៀបនៅលើកាតផលិតផល។",
  }

  // Load products from URL params if they differ from context
  useEffect(() => {
    if (hasInitialized) return
    if (initialProductIds.length === 0) {
      setHasInitialized(true)
      return
    }

    // Check if products are already loaded in context
    const contextIds = compareProducts.map((p) => p.id)
    const needsLoad = initialProductIds.some((id) => !contextIds.includes(id))

    if (!needsLoad && compareProducts.length > 0) {
      setHasInitialized(true)
      return
    }

    // Fetch products from API
    const fetchProducts = async () => {
      setIsLoading(true)
      try {
        // Clear existing products first
        clearCompare()

        // Fetch each product
        for (const id of initialProductIds) {
          const res = await fetch(`/api/products/${id}`)
          if (res.ok) {
            const data = await res.json()
            if (data.product) {
              addToCompare(data.product as Product)
            }
          }
        }
      } catch (error) {
        console.error("Failed to load comparison products:", error)
      } finally {
        setIsLoading(false)
        setHasInitialized(true)
      }
    }

    fetchProducts()
  }, [initialProductIds, hasInitialized])

  const handleAddToCart = (
    id: string,
    name: string,
    price: number,
    image: string
  ) => {
    addToCart(id, name, price, image)
  }

  const handleProductClick = (productId: string) => {
    router.push(`/shop/product/${productId}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push("/shop")}
            className="gap-2"
          >
            <ArrowLeft size={16} />
            {compareT.backToShop}
          </Button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : compareProducts.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag
              size={64}
              className="mx-auto text-muted-foreground mb-4"
            />
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              {compareT.noProducts}
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {compareT.addProducts}
            </p>
            <Button onClick={() => router.push("/shop")}>
              {compareT.continueShopping}
            </Button>
          </div>
        ) : (
          <ComparisonTable
            products={compareProducts}
            language={language}
            currency={currency}
            onAddToCart={handleAddToCart}
            onProductClick={handleProductClick}
          />
        )}
      </div>
    </div>
  )
}

export function ComparePageClient({ initialProductIds }: ComparePageClientProps) {
  return (
    <ComparisonProvider>
      <ComparePageContent initialProductIds={initialProductIds} />
    </ComparisonProvider>
  )
}
