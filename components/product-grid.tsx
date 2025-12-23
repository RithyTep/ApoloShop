"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ShoppingCart } from "lucide-react"
import { useProducts, useCategories, Product } from "@/lib/api-hooks"
import { useState } from "react"

interface ProductGridProps {
  onAddToCart: (id: string, name: string, price: number, image: string) => void
  currency: "USD" | "KHR"
  language: "EN" | "KH"
}

export function ProductGrid({ onAddToCart, currency, language }: ProductGridProps) {
  const [categoryFilter, setCategoryFilter] = useState("")
  const { data: productsData, isLoading: productsLoading } = useProducts(categoryFilter || undefined)
  const { data: categoriesData } = useCategories()

  const products = productsData?.products?.filter((p) => p.isActive) || []
  const categories = categoriesData?.categories?.filter((c) => c.isActive) || []

  if (productsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-card border border-border flex flex-col">
              <Skeleton className="aspect-square" />
              <div className="p-3 sm:p-4">
                <Skeleton className="h-5 w-full mb-2" />
                <Skeleton className="h-6 w-20 mb-3" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {language === "EN" ? "Our Products" : "ផលិតផលរបស់យើង"}
        </h1>
        <p className="text-muted-foreground">
          {language === "EN" ? "Fresh and delicious products crafted with care" : "ផលិតផលស្រស់ស្រាយនិងឆ្ងាញ់ដែលធ្វើឡើងដោយស្នេហា"}
        </p>
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <Button
            variant={categoryFilter === "" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter("")}
            className={categoryFilter === "" ? "bg-primary text-primary-foreground" : "bg-transparent"}
          >
            {language === "EN" ? "All" : "ទាំងអស់"}
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={categoryFilter === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter(cat.id)}
              className={categoryFilter === cat.id ? "bg-primary text-primary-foreground" : "bg-transparent"}
            >
              {language === "EN" ? cat.nameEn : cat.nameKh}
            </Button>
          ))}
        </div>
      )}

      {products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map((product) => {
            const inStock = (product.inventory?.quantity || 0) > 0
            const price = currency === "USD" ? product.priceUsd : product.priceKhr

            return (
              <div key={product.id} className="bg-card border border-border flex flex-col">
                {/* Image */}
                <div className="aspect-square overflow-hidden bg-muted">
                  <img
                    src={product.imageUrl || "/placeholder.svg"}
                    alt={product.nameEn}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Content */}
                <div className="p-3 sm:p-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1">
                    {language === "EN" ? product.nameEn : product.nameKh}
                  </h3>

                  {/* Price */}
                  <p className="text-lg sm:text-xl font-bold text-primary mb-3">
                    {currency === "USD" ? `$${product.priceUsd.toFixed(2)}` : `${product.priceKhr.toLocaleString()}៛`}
                  </p>

                  {/* Stock Badge */}
                  <div className="mb-3">
                    <Badge
                      variant={inStock ? "default" : "outline"}
                      className={`text-xs sm:text-sm ${
                        inStock ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
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

                  {/* Add to Cart Button */}
                  <Button
                    onClick={() => onAddToCart(product.id, product.nameEn, product.priceUsd, product.imageUrl || "")}
                    disabled={!inStock}
                    className="w-full bg-primary text-primary-foreground hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-auto"
                  >
                    <ShoppingCart size={16} />
                    <span className="text-sm sm:text-base">{language === "EN" ? "Add to Cart" : "បន្ថែមទៅរទុក"}</span>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="py-12 text-center text-muted-foreground">
          {language === "EN" ? "No products available" : "មិនមានផលិតផលទេ"}
        </div>
      )}
    </div>
  )
}
