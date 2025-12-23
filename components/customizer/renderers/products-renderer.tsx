"use client"

import { ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { ProductsConfig, useProducts } from "@/lib/api-hooks"

interface ProductsRendererProps {
  config: ProductsConfig
  language: "EN" | "KH"
  currency: "USD" | "KHR"
  onAddToCart?: (id: string, name: string, price: number, image: string) => void
  isPreview?: boolean
  previewMode?: "desktop" | "tablet" | "mobile"
}

export function ProductsRenderer({
  config,
  language,
  currency,
  onAddToCart,
  isPreview,
  previewMode,
}: ProductsRendererProps) {
  const { data: productsData, isLoading } = useProducts(
    config.displayType === "category" ? config.categoryId : undefined
  )

  let products = productsData?.products?.filter((p) => p.isActive) || []

  // Limit products
  products = products.slice(0, config.maxProducts)

  const title = language === "EN" ? config.titleEn : config.titleKh

  // Responsive grid based on preview mode or viewport
  const getGridCols = () => {
    const desktopCols: Record<number, string> = {
      2: "grid-cols-2",
      3: "grid-cols-3",
      4: "grid-cols-4",
    }

    if (isPreview && previewMode) {
      // In preview, use fixed columns based on device
      if (previewMode === "mobile") return "grid-cols-2"
      if (previewMode === "tablet") return config.columns >= 3 ? "grid-cols-3" : "grid-cols-2"
      return desktopCols[Math.min(config.columns, 4)] || "grid-cols-4"
    }
    // Normal responsive behavior
    const gridCols: Record<number, string> = {
      2: "grid-cols-2",
      3: "grid-cols-2 md:grid-cols-3",
      4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    }
    return gridCols[config.columns] || "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
  }

  if (isLoading) {
    return (
      <section className="py-12 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className={cn("grid gap-4 md:gap-6", getGridCols())}>
            {Array.from({ length: config.maxProducts }).map((_, i) => (
              <div key={i} className="bg-card border border-border">
                <Skeleton className="aspect-square" />
                <div className="p-3">
                  <Skeleton className="h-5 w-full mb-2" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (products.length === 0) {
    return (
      <section className="py-12 px-4 md:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">{title}</h2>
          <p className="text-muted-foreground">No products available</p>
        </div>
      </section>
    )
  }

  return (
    <section className="py-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {title && (
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">
            {title}
          </h2>
        )}

        <div className={cn("grid gap-4 md:gap-6", getGridCols())}>
          {products.map((product) => {
            const inStock = (product.inventory?.quantity || 0) > 0

            return (
              <div
                key={product.id}
                className="bg-card border border-border flex flex-col group"
              >
                {/* Image */}
                <div className="aspect-square overflow-hidden bg-muted">
                  <img
                    src={product.imageUrl || "/placeholder.svg"}
                    alt={language === "EN" ? product.nameEn : product.nameKh}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Content */}
                <div className="p-3 sm:p-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1 line-clamp-2">
                    {language === "EN" ? product.nameEn : product.nameKh}
                  </h3>

                  {/* Price */}
                  {config.showPrice && (
                    <p className="text-lg sm:text-xl font-bold text-primary mb-2">
                      {currency === "USD"
                        ? `$${Number(product.priceUsd).toFixed(2)}`
                        : `${Number(product.priceKhr).toLocaleString()}៛`}
                    </p>
                  )}

                  {/* Stock Badge */}
                  {config.showStock && (
                    <div className="mb-2">
                      <Badge
                        variant={inStock ? "default" : "outline"}
                        className={cn(
                          "text-xs",
                          inStock
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {language === "EN"
                          ? inStock
                            ? "In Stock"
                            : "Out of Stock"
                          : inStock
                            ? "មាននៅក្នុងស្តុក"
                            : "អស់ស្តុក"}
                      </Badge>
                    </div>
                  )}

                  {/* Add to Cart Button */}
                  {config.showAddToCart && (
                    <Button
                      onClick={() =>
                        !isPreview &&
                        onAddToCart?.(
                          product.id,
                          product.nameEn,
                          product.priceUsd,
                          product.imageUrl || ""
                        )
                      }
                      disabled={!inStock}
                      className="w-full mt-auto"
                      size="sm"
                    >
                      <ShoppingCart size={14} className="mr-2" />
                      {language === "EN" ? "Add to Cart" : "បន្ថែមទៅរទុក"}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
