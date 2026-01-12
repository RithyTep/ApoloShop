"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Minus, Plus, ShoppingCart, Package } from "lucide-react"
import { Product, useProductReviews } from "@/lib/api-hooks"
import { useRecentlyViewed } from "@/lib/use-recently-viewed"
import { RecentlyViewed } from "@/components/recently-viewed"
import { ProductRecommendations } from "@/components/product-recommendations"
import { ProductReviews } from "@/components/product-reviews"
import { StarRating } from "@/components/star-rating"

interface ProductDetailClientProps {
  product: Product & { _reviewStats?: { averageRating: number; totalReviews: number } }
  language?: "EN" | "KH"
  currency?: "USD" | "KHR"
}

export function ProductDetailClient({ product: initialProduct, language: initialLanguage = "EN", currency: initialCurrency = "USD" }: ProductDetailClientProps) {
  const router = useRouter()
  const productId = initialProduct.id
  const product = initialProduct

  const [quantity, setQuantity] = useState(1)
  const [language, setLanguage] = useState<"EN" | "KH">(initialLanguage)
  const [currency, setCurrency] = useState<"USD" | "KHR">(initialCurrency)
  const { addViewedProduct } = useRecentlyViewed()

  // Fetch reviews for rating display (client-side for real-time updates)
  const { data: reviewsData } = useProductReviews(productId, { limit: 0 })

  // Track this product as recently viewed
  useEffect(() => {
    if (product?.id) {
      addViewedProduct(product.id)
    }
  }, [product?.id, addViewedProduct])

  const handleAddToCart = () => {
    if (product) {
      // Get existing cart from localStorage
      const existingCart = JSON.parse(localStorage.getItem("cart") || "[]")
      const existingItem = existingCart.find((item: { id: string }) => item.id === product.id)

      if (existingItem) {
        existingItem.quantity += quantity
      } else {
        existingCart.push({
          id: product.id,
          nameEn: product.nameEn,
          nameKh: product.nameKh,
          priceUsd: product.priceUsd,
          priceKhr: product.priceKhr,
          imageUrl: product.imageUrl,
          quantity,
        })
      }

      localStorage.setItem("cart", JSON.stringify(existingCart))
      window.dispatchEvent(new Event("cartUpdated"))

      // Show feedback
      router.push("/shop")
    }
  }

  const formatPrice = (priceUsd: number, priceKhr: number) => {
    if (currency === "USD") {
      return `$${priceUsd.toFixed(2)}`
    }
    return `${priceKhr.toLocaleString()}៛`
  }

  const getName = (nameEn: string, nameKh: string) => {
    return language === "EN" ? nameEn : nameKh
  }

  const getDescription = (descEn?: string, descKh?: string) => {
    return language === "EN" ? descEn : descKh
  }

  const inStock = product.inventory ? product.inventory.quantity > 0 : true

  // Use client-fetched reviews if available, fallback to SSR stats
  const reviewStats = reviewsData?.stats || product._reviewStats

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-background border-b border-border z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/shop" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
              <ArrowLeft size={20} />
              <span className="font-medium">Back to Shop</span>
            </Link>

            {/* Language/Currency Toggles */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded">
                <button
                  onClick={() => setLanguage("EN")}
                  className={`text-sm font-medium transition-colors ${
                    language === "EN" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  EN
                </button>
                <span className="text-muted-foreground">/</span>
                <button
                  onClick={() => setLanguage("KH")}
                  className={`text-sm font-medium transition-colors ${
                    language === "KH" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  ខ្មែរ
                </button>
              </div>

              <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded">
                <button
                  onClick={() => setCurrency("USD")}
                  className={`text-sm font-medium transition-colors ${
                    currency === "USD" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  USD
                </button>
                <span className="text-muted-foreground">/</span>
                <button
                  onClick={() => setCurrency("KHR")}
                  className={`text-sm font-medium transition-colors ${
                    currency === "KHR" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  KHR
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-8 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Image */}
          <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={getName(product.nameEn, product.nameKh)}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Package className="h-24 w-24 text-muted-foreground" />
              </div>
            )}
            {!inStock && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  Out of Stock
                </Badge>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Category Badge */}
            {product.category && (
              <Badge variant="outline" className="text-sm">
                {getName(product.category.nameEn, product.category.nameKh)}
              </Badge>
            )}

            {/* Name */}
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {getName(product.nameEn, product.nameKh)}
            </h1>

            {/* Rating */}
            {reviewStats && reviewStats.totalReviews > 0 && (
              <div className="flex items-center gap-2">
                <StarRating
                  rating={reviewStats.averageRating}
                  size="md"
                  showValue
                  showCount
                  totalReviews={reviewStats.totalReviews}
                />
              </div>
            )}

            {/* Price */}
            <div className="text-3xl font-bold text-primary">
              {formatPrice(product.priceUsd, product.priceKhr)}
            </div>

            {/* Description */}
            {getDescription(product.descriptionEn, product.descriptionKh) && (
              <div className="prose prose-sm max-w-none">
                <p className="text-muted-foreground leading-relaxed">
                  {getDescription(product.descriptionEn, product.descriptionKh)}
                </p>
              </div>
            )}

            {/* SKU */}
            <div className="text-sm text-muted-foreground">
              SKU: <span className="font-mono">{product.sku}</span>
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${inStock ? "bg-success" : "bg-destructive"}`} />
              <span className={inStock ? "text-success" : "text-destructive"}>
                {inStock
                  ? `In Stock${product.inventory ? ` (${product.inventory.quantity} available)` : ""}`
                  : "Out of Stock"}
              </span>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-foreground">Quantity:</span>
              <div className="flex items-center border border-border rounded">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 hover:bg-muted transition-colors"
                  disabled={quantity <= 1}
                >
                  <Minus size={16} />
                </button>
                <span className="px-4 py-2 font-medium min-w-[60px] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 hover:bg-muted transition-colors"
                  disabled={product.inventory && quantity >= product.inventory.quantity}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <Button
              onClick={handleAddToCart}
              disabled={!inStock}
              className="w-full h-14 text-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              {inStock ? "Add to Cart" : "Out of Stock"}
            </Button>

            {/* Total */}
            {inStock && quantity > 1 && (
              <div className="text-center text-muted-foreground">
                Total: <span className="font-bold text-foreground">
                  {formatPrice(product.priceUsd * quantity, product.priceKhr * quantity)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Product Recommendations */}
        <ProductRecommendations
          productId={productId}
          language={language}
          currency={currency}
          maxDisplay={4}
        />

        {/* Recently Viewed Products */}
        <RecentlyViewed
          language={language}
          currency={currency}
          excludeProductId={productId}
          maxDisplay={4}
        />

        {/* Product Reviews */}
        <ProductReviews productId={productId} language={language} />
      </main>
    </div>
  )
}

// Loading skeleton for the product detail
export function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 bg-background border-b border-border z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Skeleton className="h-8 w-32" />
        </div>
      </header>
      <main className="pt-20 pb-8 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square w-full" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </main>
    </div>
  )
}

// Not found component
export function ProductNotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="p-8 text-center max-w-md">
        <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Product Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The product you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Link href="/shop">
          <Button className="bg-primary text-primary-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Shop
          </Button>
        </Link>
      </Card>
    </div>
  )
}
