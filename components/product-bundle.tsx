"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ShoppingCart, Package, Check, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { translations } from "@/lib/i18n"

// Types
interface BundleProduct {
  id: string
  nameEn: string
  nameKh: string
  priceUsd: number
  priceKhr: number
  imageUrl: string | null
  isActive?: boolean
}

interface BundleItem {
  id: string
  productId: string
  quantity: number
  sortOrder: number
  product: BundleProduct | null
}

interface BundlePricing {
  originalPriceUsd: number
  originalPriceKhr: number
  bundlePriceUsd: number
  bundlePriceKhr: number
  savingsUsd: number
  savingsKhr: number
  savingsPercent: number
}

interface Bundle {
  id: string
  nameEn: string
  nameKh: string
  descriptionEn?: string | null
  descriptionKh?: string | null
  imageUrl?: string | null
  discountType: "PERCENTAGE" | "FIXED"
  discountValue: number
  isActive: boolean
  isFeatured: boolean
  items: BundleItem[]
  pricing: BundlePricing
  isInStock: boolean
}

interface ProductBundleCardProps {
  bundle: Bundle
  currency: "USD" | "KHR"
  language: "EN" | "KH"
  onAddToCart: (bundle: Bundle) => void
}

// Helper function for price formatting
function formatPrice(price: number, currency: "USD" | "KHR"): string {
  if (currency === "USD") {
    return `$${price.toFixed(2)}`
  }
  return `${price.toLocaleString()}៛`
}

// Bundle Card Component
export function ProductBundleCard({
  bundle,
  currency,
  language,
  onAddToCart,
}: ProductBundleCardProps) {
  const t = translations[language === "EN" ? "en" : "kh"]
  const bundleT = t.bundle || {
    addToCart: language === "EN" ? "Add Bundle to Cart" : "បន្ថែមបណ្តុំទៅកន្ត្រក",
    outOfStock: language === "EN" ? "Out of Stock" : "អស់ស្តុក",
    save: language === "EN" ? "Save" : "សន្សំ",
    items: language === "EN" ? "items" : "មុខទំនិញ",
    bundleDeal: language === "EN" ? "Bundle Deal" : "កញ្ចប់ពិសេស",
  }

  const name = language === "EN" ? bundle.nameEn : bundle.nameKh
  const description = language === "EN" ? bundle.descriptionEn : bundle.descriptionKh
  const pricing = bundle.pricing

  const originalPrice = currency === "USD" ? pricing.originalPriceUsd : pricing.originalPriceKhr
  const bundlePrice = currency === "USD" ? pricing.bundlePriceUsd : pricing.bundlePriceKhr
  const savings = currency === "USD" ? pricing.savingsUsd : pricing.savingsKhr

  return (
    <Card className="group relative overflow-hidden transition-shadow hover:shadow-lg">
      {bundle.isFeatured && (
        <Badge className="absolute top-2 left-2 z-10 bg-yellow-500 text-white">
          {bundleT.bundleDeal}
        </Badge>
      )}

      {pricing.savingsPercent > 0 && (
        <Badge className="absolute top-2 right-2 z-10 bg-red-500 text-white">
          {bundleT.save} {pricing.savingsPercent}%
        </Badge>
      )}

      <CardHeader className="pb-2">
        <CardTitle className="text-lg line-clamp-2">{name}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        )}
      </CardHeader>

      <CardContent className="pb-2">
        {/* Bundle products preview */}
        <div className="flex flex-wrap gap-2 mb-4">
          {bundle.items.slice(0, 4).map((item, index) => (
            <div
              key={item.id}
              className="relative w-16 h-16 rounded-lg overflow-hidden border bg-muted"
            >
              {item.product?.imageUrl ? (
                <Image
                  src={item.product.imageUrl}
                  alt={language === "EN" ? item.product.nameEn : item.product.nameKh}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              {item.quantity > 1 && (
                <Badge className="absolute -bottom-1 -right-1 text-xs px-1 py-0 min-w-5 h-5">
                  x{item.quantity}
                </Badge>
              )}
              {index < bundle.items.length - 1 && index < 3 && (
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                  <Plus className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          {bundle.items.length > 4 && (
            <div className="w-16 h-16 rounded-lg border bg-muted flex items-center justify-center text-sm text-muted-foreground">
              +{bundle.items.length - 4}
            </div>
          )}
        </div>

        {/* Item count */}
        <p className="text-sm text-muted-foreground mb-2">
          {bundle.items.reduce((sum, item) => sum + item.quantity, 0)} {bundleT.items}
        </p>

        {/* Pricing */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary">
            {formatPrice(bundlePrice, currency)}
          </span>
          <span className="text-sm text-muted-foreground line-through">
            {formatPrice(originalPrice, currency)}
          </span>
        </div>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          onClick={() => onAddToCart(bundle)}
          disabled={!bundle.isInStock}
        >
          {bundle.isInStock ? (
            <>
              <ShoppingCart className="h-4 w-4 mr-2" />
              {bundleT.addToCart}
            </>
          ) : (
            bundleT.outOfStock
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

// Frequently Bought Together Component
interface FrequentlyBoughtTogetherProps {
  productId: string
  currency: "USD" | "KHR"
  language: "EN" | "KH"
  onAddToCart: (products: { id: string; name: string; price: number; image: string; quantity: number }[]) => void
}

interface Suggestion {
  product: BundleProduct & { inventory?: { quantity: number } | null }
  coOccurrenceCount: number
  source: "order_history" | "category"
}

interface SuggestedBundle {
  products: BundleProduct[]
  originalPriceUsd: number
  originalPriceKhr: number
  bundlePriceUsd: number
  bundlePriceKhr: number
  savingsUsd: number
  savingsPercent: number
}

export function FrequentlyBoughtTogether({
  productId,
  currency,
  language,
  onAddToCart,
}: FrequentlyBoughtTogetherProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [suggestedBundle, setSuggestedBundle] = useState<SuggestedBundle | null>(null)
  const [mainProduct, setMainProduct] = useState<BundleProduct | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const t = translations[language === "EN" ? "en" : "kh"]
  const bundleT = t.bundle || {
    frequentlyBoughtTogether: language === "EN" ? "Frequently Bought Together" : "ទិញជាមួយគ្នាជាញឹកញាប់",
    addAllToCart: language === "EN" ? "Add All to Cart" : "បន្ថែមទាំងអស់ទៅកន្ត្រក",
    addSelectedToCart: language === "EN" ? "Add Selected to Cart" : "បន្ថែមដែលបានជ្រើសទៅកន្ត្រក",
    totalPrice: language === "EN" ? "Total Price" : "តម្លៃសរុប",
    bundlePrice: language === "EN" ? "Bundle Price" : "តម្លៃកញ្ចប់",
    youSave: language === "EN" ? "You Save" : "អ្នកសន្សំ",
    popular: language === "EN" ? "Popular" : "ពេញនិយម",
  }

  // Fetch suggestions on mount
  useState(() => {
    async function fetchSuggestions() {
      try {
        const res = await fetch(`/api/bundles/suggestions?productId=${productId}&limit=3`)
        if (!res.ok) throw new Error("Failed to fetch suggestions")
        const data = await res.json()
        setSuggestions(data.suggestions || [])
        setSuggestedBundle(data.suggestedBundle || null)
        setMainProduct(data.mainProduct || null)
        // Select all by default
        const allIds = new Set<string>([productId])
        data.suggestions?.forEach((s: Suggestion) => allIds.add(s.product.id))
        setSelectedProducts(allIds)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading suggestions")
      } finally {
        setLoading(false)
      }
    }
    fetchSuggestions()
  })

  const toggleProduct = (id: string) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        // Don't allow deselecting the main product
        if (id === productId) return prev
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleAddToCart = () => {
    const productsToAdd = [
      mainProduct,
      ...suggestions.map((s) => s.product),
    ]
      .filter((p) => p && selectedProducts.has(p.id))
      .map((p) => ({
        id: p!.id,
        name: language === "EN" ? p!.nameEn : p!.nameKh,
        price: currency === "USD" ? p!.priceUsd : p!.priceKhr,
        image: p!.imageUrl || "/placeholder.svg",
        quantity: 1,
      }))

    onAddToCart(productsToAdd)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="flex gap-4">
          <Skeleton className="h-32 w-32 rounded-lg" />
          <Skeleton className="h-32 w-32 rounded-lg" />
          <Skeleton className="h-32 w-32 rounded-lg" />
        </div>
      </div>
    )
  }

  if (error || suggestions.length === 0) {
    return null // Don't show anything if no suggestions
  }

  // Calculate selected total
  const selectedTotal = [mainProduct, ...suggestions.map((s) => s.product)]
    .filter((p) => p && selectedProducts.has(p.id))
    .reduce((sum, p) => sum + (currency === "USD" ? p!.priceUsd : p!.priceKhr), 0)

  // Bundle discount (10%)
  const discountedTotal = selectedTotal * 0.9
  const savings = selectedTotal - discountedTotal

  return (
    <div className="border rounded-lg p-4 bg-muted/30">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Package className="h-5 w-5" />
        {bundleT.frequentlyBoughtTogether}
      </h3>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        {/* Main product */}
        {mainProduct && (
          <div
            className={cn(
              "relative w-24 h-24 rounded-lg overflow-hidden border-2 cursor-pointer transition-all",
              selectedProducts.has(mainProduct.id)
                ? "border-primary ring-2 ring-primary/20"
                : "border-muted opacity-60"
            )}
            onClick={() => toggleProduct(mainProduct.id)}
          >
            {mainProduct.imageUrl ? (
              <Image
                src={mainProduct.imageUrl}
                alt={language === "EN" ? mainProduct.nameEn : mainProduct.nameKh}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            {selectedProducts.has(mainProduct.id) && (
              <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                <Check className="h-3 w-3" />
              </div>
            )}
          </div>
        )}

        {/* Suggested products */}
        {suggestions.map((suggestion, index) => (
          <div key={suggestion.product.id} className="flex items-center gap-2">
            {index === 0 && <Plus className="h-4 w-4 text-muted-foreground" />}
            <div
              className={cn(
                "relative w-24 h-24 rounded-lg overflow-hidden border-2 cursor-pointer transition-all",
                selectedProducts.has(suggestion.product.id)
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-muted opacity-60"
              )}
              onClick={() => toggleProduct(suggestion.product.id)}
            >
              {suggestion.product.imageUrl ? (
                <Image
                  src={suggestion.product.imageUrl}
                  alt={language === "EN" ? suggestion.product.nameEn : suggestion.product.nameKh}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              {selectedProducts.has(suggestion.product.id) && (
                <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                  <Check className="h-3 w-3" />
                </div>
              )}
              {suggestion.source === "order_history" && suggestion.coOccurrenceCount > 2 && (
                <Badge className="absolute bottom-1 left-1 text-xs px-1 py-0 bg-yellow-500">
                  {bundleT.popular}
                </Badge>
              )}
            </div>
            {index < suggestions.length - 1 && (
              <Plus className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {/* Product names and prices */}
      <div className="space-y-1 mb-4">
        {mainProduct && (
          <div className="flex justify-between text-sm">
            <span className={cn(!selectedProducts.has(mainProduct.id) && "opacity-50")}>
              {language === "EN" ? mainProduct.nameEn : mainProduct.nameKh}
            </span>
            <span className={cn(!selectedProducts.has(mainProduct.id) && "opacity-50")}>
              {formatPrice(
                currency === "USD" ? mainProduct.priceUsd : mainProduct.priceKhr,
                currency
              )}
            </span>
          </div>
        )}
        {suggestions.map((s) => (
          <div key={s.product.id} className="flex justify-between text-sm">
            <span className={cn(!selectedProducts.has(s.product.id) && "opacity-50")}>
              {language === "EN" ? s.product.nameEn : s.product.nameKh}
            </span>
            <span className={cn(!selectedProducts.has(s.product.id) && "opacity-50")}>
              {formatPrice(
                currency === "USD" ? s.product.priceUsd : s.product.priceKhr,
                currency
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Pricing summary */}
      <div className="border-t pt-3 space-y-1">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{bundleT.totalPrice}:</span>
          <span className="line-through">{formatPrice(selectedTotal, currency)}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>{bundleT.bundlePrice}:</span>
          <span className="text-primary">{formatPrice(discountedTotal, currency)}</span>
        </div>
        {savings > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>{bundleT.youSave}:</span>
            <span>{formatPrice(savings, currency)} (10%)</span>
          </div>
        )}
      </div>

      {/* Add to cart button */}
      <Button className="w-full mt-4" onClick={handleAddToCart}>
        <ShoppingCart className="h-4 w-4 mr-2" />
        {selectedProducts.size === suggestions.length + 1
          ? bundleT.addAllToCart
          : bundleT.addSelectedToCart}
      </Button>
    </div>
  )
}

// Bundle List Component for displaying all bundles
interface BundleListProps {
  bundles: Bundle[]
  currency: "USD" | "KHR"
  language: "EN" | "KH"
  onAddToCart: (bundle: Bundle) => void
  loading?: boolean
}

export function BundleList({
  bundles,
  currency,
  language,
  onAddToCart,
  loading,
}: BundleListProps) {
  const t = translations[language === "EN" ? "en" : "kh"]
  const bundleT = t.bundle || {
    noBundles: language === "EN" ? "No bundles available" : "មិនមានកញ្ចប់ទេ",
    bundles: language === "EN" ? "Bundle Deals" : "កញ្ចប់ពិសេស",
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Skeleton className="h-16 w-16 rounded-lg" />
                <Skeleton className="h-16 w-16 rounded-lg" />
                <Skeleton className="h-16 w-16 rounded-lg" />
              </div>
              <Skeleton className="h-6 w-24" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  if (bundles.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{bundleT.noBundles}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {bundles.map((bundle) => (
        <ProductBundleCard
          key={bundle.id}
          bundle={bundle}
          currency={currency}
          language={language}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  )
}

// Skeleton loader for bundle card
export function BundleCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Skeleton className="h-16 w-16 rounded-lg" />
          <Skeleton className="h-16 w-16 rounded-lg" />
          <Skeleton className="h-16 w-16 rounded-lg" />
        </div>
        <Skeleton className="h-4 w-20 mb-2" />
        <Skeleton className="h-6 w-24" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  )
}
