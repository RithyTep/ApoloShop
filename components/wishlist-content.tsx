"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Heart, ShoppingCart, Trash2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage, useCurrency, useCart } from "@/lib/shop-context"
import { useWishlist } from "@/lib/use-wishlist"
import { translations } from "@/lib/i18n"

export function WishlistContent() {
  const { language } = useLanguage()
  const { currency } = useCurrency()
  const { addToCart } = useCart()
  const {
    wishlistItems,
    wishlistCount,
    isLoading,
    fetchWishlistItems,
    removeFromWishlist,
    clearWishlist,
  } = useWishlist()

  const [isFetched, setIsFetched] = useState(false)

  const t = translations[language === "EN" ? "en" : "kh"]

  // Fetch wishlist items on mount
  useEffect(() => {
    if (!isFetched) {
      fetchWishlistItems().then(() => setIsFetched(true))
    }
  }, [fetchWishlistItems, isFetched])

  const handleAddToCart = (item: typeof wishlistItems[0]) => {
    const name = language === "EN" ? item.product.nameEn : item.product.nameKh
    const price = currency === "USD" ? item.product.priceUsd : item.product.priceKhr
    addToCart(item.product.id, name, price, item.product.imageUrl || "")
  }

  if (isLoading || !isFetched) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border">
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
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Heart className="text-red-500" size={28} />
            {t.wishlist?.title || (language === "EN" ? "My Wishlist" : "បញ្ជីប្រាថ្នារបស់ខ្ញុំ")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {wishlistCount === 0
              ? t.wishlist?.empty || (language === "EN" ? "Your wishlist is empty" : "បញ្ជីប្រាថ្នារបស់អ្នកគឺទទេ")
              : `${wishlistCount} ${t.wishlist?.items || (language === "EN" ? "items" : "មុខទំនិញ")}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/shop">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft size={16} />
              {language === "EN" ? "Continue Shopping" : "បន្តទិញ"}
            </Button>
          </Link>
          {wishlistCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearWishlist}
              className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 size={16} />
              {t.wishlist?.clearAll || (language === "EN" ? "Clear All" : "សម្អាតទាំងអស់")}
            </Button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {wishlistCount === 0 ? (
        <div className="py-20 text-center">
          <Heart className="mx-auto text-muted-foreground mb-4" size={64} />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {t.wishlist?.emptyTitle || (language === "EN" ? "Your wishlist is empty" : "បញ្ជីប្រាថ្នារបស់អ្នកគឺទទេ")}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t.wishlist?.emptyDescription || (language === "EN"
              ? "Browse our products and save your favorites"
              : "រកមើលផលិតផលរបស់យើងហើយរក្សាទុកអ្វីដែលអ្នកចូលចិត្ត")}
          </p>
          <Link href="/shop">
            <Button className="gap-2">
              <ShoppingCart size={18} />
              {language === "EN" ? "Start Shopping" : "ចាប់ផ្តើមទិញ"}
            </Button>
          </Link>
        </div>
      ) : (
        /* Wishlist Grid */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {wishlistItems.map((item) => {
            const inStock = (item.product.inventory?.quantity || 0) > 0
            const name = language === "EN" ? item.product.nameEn : item.product.nameKh

            return (
              <div
                key={item.id}
                className="bg-card border border-border flex flex-col group"
              >
                {/* Image */}
                <div className="relative">
                  <Link href={`/shop/product/${item.product.id}`}>
                    <div className="aspect-square overflow-hidden bg-muted">
                      <img
                        src={item.product.imageUrl || "/placeholder.svg"}
                        alt={name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </Link>
                  {/* Remove button */}
                  <button
                    onClick={() => removeFromWishlist(item.product.id)}
                    className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded-full bg-white/90 hover:bg-red-50 transition-colors"
                    aria-label="Remove from wishlist"
                  >
                    <Heart size={16} className="fill-red-500 text-red-500" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-3 sm:p-4 flex flex-col flex-1">
                  <Link href={`/shop/product/${item.product.id}`}>
                    <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1 line-clamp-2 hover:text-primary transition-colors">
                      {name}
                    </h3>
                  </Link>

                  {/* Category */}
                  {item.product.category && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {language === "EN"
                        ? item.product.category.nameEn
                        : item.product.category.nameKh}
                    </p>
                  )}

                  {/* Price */}
                  <p className="text-lg sm:text-xl font-bold text-primary mb-2">
                    {currency === "USD"
                      ? `$${Number(item.product.priceUsd).toFixed(2)}`
                      : `${Number(item.product.priceKhr).toLocaleString()}៛`}
                  </p>

                  {/* Stock Badge */}
                  <div className="mb-3">
                    <Badge
                      variant={inStock ? "default" : "outline"}
                      className={`text-xs ${
                        inStock
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
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
                    onClick={() => handleAddToCart(item)}
                    disabled={!inStock}
                    className="w-full mt-auto gap-2"
                    size="sm"
                  >
                    <ShoppingCart size={14} />
                    {language === "EN" ? "Add to Cart" : "បន្ថែមទៅរទុក"}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
