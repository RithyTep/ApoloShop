"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Package, X, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useRecentlyViewed } from "@/lib/use-recently-viewed"
import { translations } from "@/lib/i18n"
import type { Product } from "@/lib/api-hooks"

interface RecentlyViewedProps {
  language?: "EN" | "KH"
  currency?: "USD" | "KHR"
  excludeProductId?: string
  maxDisplay?: number
}

export function RecentlyViewed({
  language = "EN",
  currency = "USD",
  excludeProductId,
  maxDisplay = 4,
}: RecentlyViewedProps) {
  const { viewedIds, getViewedExcluding, clearRecentlyViewed } = useRecentlyViewed()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const t = translations[language === "EN" ? "en" : "kh"]

  // Get IDs to display (excluding current product if on product page)
  const displayIds = getViewedExcluding(excludeProductId).slice(0, maxDisplay)

  // Fetch product details for the viewed IDs
  useEffect(() => {
    const fetchProducts = async () => {
      if (displayIds.length === 0) {
        setProducts([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        // Fetch each product in parallel
        const productPromises = displayIds.map(async (id) => {
          const res = await fetch(`/api/products?id=${id}`)
          if (!res.ok) return null
          const data = await res.json()
          return data.product as Product
        })

        const results = await Promise.all(productPromises)
        setProducts(results.filter((p): p is Product => p !== null))
      } catch {
        setProducts([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [displayIds.join(",")])

  const formatPrice = (priceUsd: number, priceKhr: number) => {
    if (currency === "USD") {
      return `$${Number(priceUsd).toFixed(2)}`
    }
    return `${Number(priceKhr).toLocaleString()}៛`
  }

  const getName = (product: Product) => {
    return language === "EN" ? product.nameEn : product.nameKh
  }

  // Don't render if no products to show
  if (!isLoading && products.length === 0) {
    return null
  }

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground">
          {t.recentlyViewed?.title || (language === "EN" ? "Recently Viewed" : "បានមើលថ្មីៗ")}
        </h2>
        {products.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearRecentlyViewed}
            className="text-muted-foreground hover:text-foreground"
          >
            <Trash2 size={14} className="mr-1" />
            {t.recentlyViewed?.clear || (language === "EN" ? "Clear" : "សម្អាត")}
          </Button>
        )}
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
          {products.map((product) => (
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
              </div>

              {/* Content */}
              <div className="p-3 flex flex-col flex-1">
                <h3 className="font-medium text-sm text-foreground mb-1 line-clamp-2">
                  {getName(product)}
                </h3>
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
