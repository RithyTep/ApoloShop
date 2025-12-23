"use client"

import { ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useCart, useLanguage, useCurrency } from "@/lib/shop-context"
import type { ProductsConfig, Product } from "@/lib/api-hooks"

interface ProductsSectionProps {
  config: ProductsConfig
  initialProducts: Product[]
}

export function ProductsSection({ config, initialProducts }: ProductsSectionProps) {
  const { addToCart } = useCart()
  const { language } = useLanguage()
  const { currency } = useCurrency()

  // Filter and limit products
  let products = initialProducts.filter((p) => p.isActive)

  // Filter by category if needed
  if (config.displayType === "category" && config.categoryId) {
    products = products.filter((p) => p.categoryId === config.categoryId)
  }

  // Limit products
  products = products.slice(0, config.maxProducts)

  const title = language === "EN" ? config.titleEn : config.titleKh

  // Responsive grid classes
  const getGridCols = () => {
    const gridCols: Record<number, string> = {
      2: "grid-cols-2",
      3: "grid-cols-2 md:grid-cols-3",
      4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    }
    return gridCols[config.columns] || "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
  }

  if (products.length === 0) {
    return (
      <section id="products" className="py-12 px-4 md:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">{title}</h2>
          <p className="text-muted-foreground">
            {language === "EN" ? "No products available" : "មិនមានផលិតផល"}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section id="products" className="py-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {title && (
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">
            {title}
          </h2>
        )}

        <div className={cn("grid gap-4 md:gap-6", getGridCols())}>
          {products.map((product) => {
            const inStock = (product.inventory?.quantity || 0) > 0
            const price = currency === "USD" ? product.priceUsd : product.priceKhr

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
                        addToCart(
                          product.id,
                          language === "EN" ? product.nameEn : product.nameKh,
                          currency === "USD" ? product.priceUsd : product.priceKhr,
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
