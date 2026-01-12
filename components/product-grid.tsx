"use client"

import { useEffect, useState, useTransition } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ShoppingCart, Plus, Minus } from "lucide-react"
import { useProducts, useCategories, Product } from "@/lib/api-hooks"
import { cn } from "@/lib/utils"
import { WishlistButton } from "@/components/wishlist-button"

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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [quantity, setQuantity] = useState(1)

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

  // Open product detail dialog
  const openProductDialog = (product: Product) => {
    setSelectedProduct(product)
    setQuantity(1)
    setDialogOpen(true)
  }

  // Handle add to cart from dialog
  const handleDialogAddToCart = () => {
    if (selectedProduct) {
      for (let i = 0; i < quantity; i++) {
        onAddToCart(selectedProduct.id, selectedProduct.nameEn, selectedProduct.priceUsd, selectedProduct.imageUrl || "")
      }
      setDialogOpen(false)
    }
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
                  {/* Image - Click to open dialog */}
                  <div className="relative">
                    <button
                      onClick={() => openProductDialog(product)}
                      className="aspect-square overflow-hidden bg-muted block w-full cursor-pointer"
                    >
                      <img
                        src={product.imageUrl || "/placeholder.svg"}
                        alt={product.nameEn}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading={index < 8 ? "eager" : "lazy"}
                      />
                    </button>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <WishlistButton productId={product.id} size="sm" language={language} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-3 sm:p-4 flex flex-col flex-1">
                    <button
                      onClick={() => openProductDialog(product)}
                      className="hover:text-primary transition-colors text-left"
                    >
                      <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1 line-clamp-2">
                        {language === "EN" ? product.nameEn : product.nameKh}
                      </h3>
                    </button>

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

      {/* Product Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-2xl w-[95vw] p-0 overflow-hidden">
          {selectedProduct && (() => {
            const inStock = (selectedProduct.inventory?.quantity || 0) > 0
            return (
              <div className="flex flex-col md:flex-row">
                {/* Product Image */}
                <div className="md:w-1/2 aspect-square bg-muted relative">
                  <img
                    src={selectedProduct.imageUrl || "/placeholder.svg"}
                    alt={selectedProduct.nameEn}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3">
                    <WishlistButton productId={selectedProduct.id} size="md" language={language} />
                  </div>
                </div>

                {/* Product Details */}
                <div className="md:w-1/2 p-6 flex flex-col">
                  <DialogHeader className="mb-4">
                    <DialogTitle className="text-xl font-bold">
                      {language === "EN" ? selectedProduct.nameEn : selectedProduct.nameKh}
                    </DialogTitle>
                  </DialogHeader>

                  {/* Description */}
                  <p className="text-muted-foreground text-sm mb-4 flex-grow">
                    {language === "EN"
                      ? selectedProduct.descriptionEn || "No description available"
                      : selectedProduct.descriptionKh || "មិនមានការពិពណ៌នាទេ"}
                  </p>

                  {/* Price */}
                  <p className="text-2xl font-bold text-primary mb-4">
                    {currency === "USD"
                      ? `$${Number(selectedProduct.priceUsd).toFixed(2)}`
                      : `${Number(selectedProduct.priceKhr).toLocaleString()}៛`}
                  </p>

                  {/* Stock Badge */}
                  <div className="mb-4">
                    <Badge
                      variant={inStock ? "default" : "outline"}
                      className={inStock ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
                    >
                      {language === "EN"
                        ? inStock ? "In Stock" : "Out of Stock"
                        : inStock ? "មាននៅក្នុងស្តុក" : "អស់ស្តុក"}
                    </Badge>
                  </div>

                  {/* Quantity Selector */}
                  {inStock && (
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-sm text-muted-foreground">
                        {language === "EN" ? "Quantity:" : "ចំនួន:"}
                      </span>
                      <div className="flex items-center border border-border rounded">
                        <button
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="p-2 hover:bg-muted transition-colors"
                          disabled={quantity <= 1}
                        >
                          <Minus size={16} />
                        </button>
                        <span className="px-4 py-2 min-w-[3rem] text-center font-medium">
                          {quantity}
                        </span>
                        <button
                          onClick={() => setQuantity(quantity + 1)}
                          className="p-2 hover:bg-muted transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Add to Cart Button */}
                  <Button
                    onClick={handleDialogAddToCart}
                    disabled={!inStock}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-transform active:scale-95"
                    size="lg"
                  >
                    <ShoppingCart size={18} />
                    <span>
                      {language === "EN" ? "Add to Cart" : "បន្ថែមទៅរទុក"}
                      {inStock && quantity > 1 && ` (${quantity})`}
                    </span>
                  </Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
