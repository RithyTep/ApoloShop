"use client"

import Link from "next/link"
import { Package, Sparkles, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useProductRecommendations, type RecommendedProduct } from "@/lib/api-hooks"
import { translations } from "@/lib/i18n"

interface ProductRecommendationsProps {
  productId: string
  language?: "EN" | "KH"
  currency?: "USD" | "KHR"
  maxDisplay?: number
}

export function ProductRecommendations({
  productId,
  language = "EN",
  currency = "USD",
  maxDisplay = 4,
}: ProductRecommendationsProps) {
  const { data, isLoading, error } = useProductRecommendations(productId, maxDisplay)

  const t = translations[language === "EN" ? "en" : "kh"]

  const formatPrice = (priceUsd: number, priceKhr: number) => {
    if (currency === "USD") {
      return `$${Number(priceUsd).toFixed(2)}`
    }
    return `${Number(priceKhr).toLocaleString()}៛`
  }

  const getName = (product: RecommendedProduct) => {
    return language === "EN" ? product.nameEn : product.nameKh
  }

  const getCategoryName = (product: RecommendedProduct) => {
    if (!product.category) return null
    return language === "EN" ? product.category.nameEn : product.category.nameKh
  }

  // Don't render if error or no recommendations
  if (error) {
    return null
  }

  if (!isLoading && (!data || data.recommendations.length === 0)) {
    return null
  }

  return (
    <section className="py-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={20} className="text-primary" />
        <h2 className="text-xl font-bold text-foreground">
          {t.recommendations?.title || (language === "EN" ? "You May Also Like" : "អ្នកក៏អាចចូលចិត្ត")}
        </h2>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: maxDisplay }).map((_, i) => (
            <div key={i} className="bg-card border border-border">
              <Skeleton className="aspect-square w-full" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data?.recommendations.map((product) => (
            <Link
              key={product.id}
              href={`/shop/product/${product.id}`}
              className="bg-card border border-border flex flex-col group hover:border-primary transition-colors"
            >
              {/* Image */}
              <div className="aspect-square overflow-hidden bg-muted relative">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={getName(product)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Package className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                {/* Recommendation type badge */}
                {product.recommendationType === "also_bought" && (
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      <Users size={10} />
                      {language === "EN" ? "Popular" : "ពេញនិយម"}
                    </Badge>
                  </div>
                )}
                {/* Out of stock indicator */}
                {product.inventory && product.inventory.quantity === 0 && (
                  <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                    <Badge variant="secondary">
                      {language === "EN" ? "Out of Stock" : "អស់ស្តុក"}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-3 flex flex-col flex-1">
                {/* Category */}
                {getCategoryName(product) && (
                  <span className="text-xs text-muted-foreground mb-1">
                    {getCategoryName(product)}
                  </span>
                )}
                {/* Name */}
                <h3 className="font-medium text-sm text-foreground mb-1 line-clamp-2 flex-1">
                  {getName(product)}
                </h3>
                {/* Price */}
                <p className="text-base font-bold text-primary">
                  {formatPrice(product.priceUsd, product.priceKhr)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
