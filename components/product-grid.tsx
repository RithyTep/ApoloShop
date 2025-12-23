"use client"

import Link from "next/link"
import { useEffect, useState, useTransition } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ShoppingCart } from "lucide-react"
import { useProducts, useCategories, Product } from "@/lib/api-hooks"
import { cn } from "@/lib/utils"

interface ProductGridProps {
  onAddToCart: (id: string, name: string, price: number, image: string) => void
  currency: "USD" | "KHR"
  language: "EN" | "KH"
}

export function ProductGrid({ onAddToCart, currency, language }: ProductGridProps) {
  const queryClient = useQueryClient()
  const [categoryFilter, setCategoryFilter] = useState("")
  const [isPending, startTransition] = useTransition()
  const [isAnimating, setIsAnimating] = useState(false)

  const { data: productsData, isLoading: productsLoading, isFetching } = useProducts(categoryFilter || undefined)
  const { data: categoriesData } = useCategories()

  const products = productsData?.products?.filter((p) => p.isActive) || []
  const categories = categoriesData?.categories?.filter((c) => c.isActive) || []

  // Preload images utility
  const preloadImages = (imageUrls: string[]) => {
    imageUrls.forEach((url) => {
      if (url && url !== "/placeholder.svg") {
        const img = new Image()
        img.src = url
      }
    })
  }

  // Preload current view's images immediately
  useEffect(() => {
    if (products.length > 0) {
      const imageUrls = products.map((p) => p.imageUrl).filter(Boolean) as string[]
      preloadImages(imageUrls)
    }
  }, [products])

  // Prefetch all categories and their images on mount for instant switching
  useEffect(() => {
    if (categories.length > 0) {
      // Prefetch "All" products and preload images
      queryClient.prefetchQuery({
        queryKey: ["products", undefined],
        queryFn: async () => {
          const res = await fetch("/api/products")
          const data = await res.json()
          // Preload images after fetching
          const imageUrls = data.products?.map((p: Product) => p.imageUrl).filter(Boolean) || []
          preloadImages(imageUrls)
          return data
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
      })

      // Prefetch each category and preload images
      categories.forEach((cat) => {
        queryClient.prefetchQuery({
          queryKey: ["products", cat.id],
          queryFn: async () => {
            const res = await fetch(`/api/products?categoryId=${cat.id}`)
            const data = await res.json()
            // Preload images after fetching
            const imageUrls = data.products?.map((p: Product) => p.imageUrl).filter(Boolean) || []
            preloadImages(imageUrls)
            return data
          },
          staleTime: 5 * 60 * 1000, // 5 minutes
        })
      })
    }
  }, [categories, queryClient])

  // Handle category change with smooth transition
  const handleCategoryChange = (newCategory: string) => {
    if (newCategory === categoryFilter) return

    setIsAnimating(true)
    startTransition(() => {
      setCategoryFilter(newCategory)
    })

    // Reset animation after transition
    setTimeout(() => setIsAnimating(false), 150)
  }

  // Show skeleton only on initial load, not on category switch
  const showSkeleton = productsLoading && !queryClient.getQueryData(["products", categoryFilter || undefined])

  if (showSkeleton) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex flex-wrap gap-2 mb-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-9 w-24" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
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

      {/* Category Filter - Sticky on scroll */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8 sticky top-[73px] bg-background/95 backdrop-blur-sm py-3 -mx-4 px-4 z-30">
          <Button
            variant={categoryFilter === "" ? "default" : "outline"}
            size="sm"
            onClick={() => handleCategoryChange("")}
            className={cn(
              "transition-all duration-200",
              categoryFilter === ""
                ? "bg-primary text-primary-foreground shadow-md scale-105"
                : "bg-transparent hover:scale-105"
            )}
          >
            {language === "EN" ? "All" : "ទាំងអស់"}
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={categoryFilter === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => handleCategoryChange(cat.id)}
              className={cn(
                "transition-all duration-200",
                categoryFilter === cat.id
                  ? "bg-primary text-primary-foreground shadow-md scale-105"
                  : "bg-transparent hover:scale-105"
              )}
            >
              {language === "EN" ? cat.nameEn : cat.nameKh}
            </Button>
          ))}
        </div>
      )}

      {/* Products Grid with smooth transition */}
      <div
        className={cn(
          "transition-all duration-200 ease-out",
          (isAnimating || isPending) ? "opacity-50 scale-[0.99]" : "opacity-100 scale-100"
        )}
      >
        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product, index) => {
              const inStock = (product.inventory?.quantity || 0) > 0

              return (
                <div
                  key={product.id}
                  className="bg-card border border-border flex flex-col group animate-in fade-in-0 slide-in-from-bottom-2"
                  style={{ animationDelay: `${index * 30}ms`, animationDuration: "300ms" }}
                >
                  {/* Image - Clickable */}
                  <Link href={`/shop/product/${product.id}`} className="aspect-square overflow-hidden bg-muted block">
                    <img
                      src={product.imageUrl || "/placeholder.svg"}
                      alt={product.nameEn}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading={index < 8 ? "eager" : "lazy"}
                    />
                  </Link>

                  {/* Content */}
                  <div className="p-3 sm:p-4 flex flex-col flex-1">
                    <Link href={`/shop/product/${product.id}`} className="hover:text-primary transition-colors">
                      <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1 line-clamp-2">
                        {language === "EN" ? product.nameEn : product.nameKh}
                      </h3>
                    </Link>

                    {/* Price */}
                    <p className="text-lg sm:text-xl font-bold text-primary mb-3">
                      {currency === "USD" ? `$${Number(product.priceUsd).toFixed(2)}` : `${Number(product.priceKhr).toLocaleString()}៛`}
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
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-auto transition-transform active:scale-95"
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
    </div>
  )
}
