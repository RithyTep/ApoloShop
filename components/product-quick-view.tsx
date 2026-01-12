"use client"

import { useState, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Plus, Minus, ChevronLeft, ChevronRight, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import { WishlistButton } from "@/components/wishlist-button"
import { translations } from "@/lib/i18n"
import type { Product } from "@/lib/api-hooks"

interface ProductQuickViewProps {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddToCart: (id: string, name: string, price: number, image: string, quantity: number) => void
  currency: "USD" | "KHR"
  language: "EN" | "KH"
}

export function ProductQuickView({
  product,
  open,
  onOpenChange,
  onAddToCart,
  currency,
  language,
}: ProductQuickViewProps) {
  const [quantity, setQuantity] = useState(1)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const t = translations[language === "EN" ? "en" : "kh"]
  const inStock = (product.inventory?.quantity || 0) > 0

  // Build image gallery from imageUrl and images array
  const images: string[] = []
  if (product.imageUrl) {
    images.push(product.imageUrl)
  }
  if (product.images && product.images.length > 0) {
    product.images.forEach((img) => {
      if (img && !images.includes(img)) {
        images.push(img)
      }
    })
  }
  if (images.length === 0) {
    images.push("/placeholder.svg")
  }

  const handlePrevImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }, [images.length])

  const handleNextImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }, [images.length])

  const handleAddToCart = () => {
    onAddToCart(
      product.id,
      language === "EN" ? product.nameEn : product.nameKh,
      currency === "USD" ? product.priceUsd : product.priceKhr,
      product.imageUrl || "",
      quantity
    )
    onOpenChange(false)
    setQuantity(1)
    setCurrentImageIndex(0)
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setQuantity(1)
      setCurrentImageIndex(0)
    }
    onOpenChange(isOpen)
  }

  const productName = language === "EN" ? product.nameEn : product.nameKh
  const productDescription = language === "EN"
    ? product.descriptionEn || t.quickView.noDescription
    : product.descriptionKh || t.quickView.noDescription

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-3xl w-[95vw] p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex flex-col md:flex-row">
          {/* Image Gallery */}
          <div className="md:w-1/2 relative bg-muted">
            {/* Main Image */}
            <div className="aspect-square relative">
              <img
                src={images[currentImageIndex]}
                alt={productName}
                className="w-full h-full object-cover"
              />

              {/* Wishlist Button */}
              <div className="absolute top-3 right-3">
                <WishlistButton productId={product.id} size="md" language={language} />
              </div>

              {/* Out of stock overlay */}
              {!inStock && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Badge variant="outline" className="text-white border-white text-lg px-4 py-2">
                    {language === "EN" ? "Out of Stock" : "អស់ស្តុក"}
                  </Badge>
                </div>
              )}

              {/* Navigation arrows (only show if multiple images) */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-md hover:bg-white transition-colors"
                    aria-label={t.quickView.previousImage}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-md hover:bg-white transition-colors"
                    aria-label={t.quickView.nextImage}
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail strip (only show if multiple images) */}
            {images.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={cn(
                      "w-16 h-16 flex-shrink-0 rounded overflow-hidden border-2 transition-all",
                      currentImageIndex === index
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-transparent opacity-70 hover:opacity-100"
                    )}
                  >
                    <img
                      src={img}
                      alt={`${productName} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="md:w-1/2 p-6 flex flex-col">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-bold leading-tight">
                {productName}
              </DialogTitle>
            </DialogHeader>

            {/* Category badge */}
            {product.category && (
              <div className="mb-3">
                <Badge variant="outline" className="text-xs">
                  {language === "EN" ? product.category.nameEn : product.category.nameKh}
                </Badge>
              </div>
            )}

            {/* Description */}
            <p className="text-muted-foreground text-sm mb-4 line-clamp-4 flex-grow">
              {productDescription}
            </p>

            {/* Price */}
            <p className="text-2xl font-bold text-primary mb-4">
              {currency === "USD"
                ? `$${Number(product.priceUsd).toFixed(2)}`
                : `${Number(product.priceKhr).toLocaleString()}៛`}
            </p>

            {/* Stock Status */}
            <div className="mb-4">
              <Badge
                variant={inStock ? "default" : "outline"}
                className={cn(
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
              {inStock && product.inventory && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({product.inventory.quantity} {t.quickView.available})
                </span>
              )}
            </div>

            {/* Quantity Selector */}
            {inStock && (
              <div className="flex items-center gap-4 mb-4">
                <span className="text-sm text-muted-foreground">
                  {t.quickView.quantity}:
                </span>
                <div className="flex items-center border border-border rounded">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 hover:bg-muted transition-colors disabled:opacity-50"
                    disabled={quantity <= 1}
                    aria-label={t.quickView.decreaseQuantity}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="px-4 py-2 min-w-[3rem] text-center font-medium">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(product.inventory?.quantity || 99, quantity + 1))}
                    className="p-2 hover:bg-muted transition-colors disabled:opacity-50"
                    disabled={quantity >= (product.inventory?.quantity || 99)}
                    aria-label={t.quickView.increaseQuantity}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Add to Cart Button */}
            <Button
              onClick={handleAddToCart}
              disabled={!inStock}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-transform active:scale-95"
              size="lg"
            >
              <ShoppingCart size={18} />
              <span>
                {t.quickView.addToCart}
                {inStock && quantity > 1 && ` (${quantity})`}
              </span>
            </Button>

            {/* View Details link */}
            <p className="text-center text-sm text-muted-foreground mt-4">
              {t.quickView.viewFullDetails}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Quick View Button component for product cards
interface QuickViewButtonProps {
  onClick: () => void
  language: "EN" | "KH"
  className?: string
}

export function QuickViewButton({ onClick, language, className }: QuickViewButtonProps) {
  const t = translations[language === "EN" ? "en" : "kh"]

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full",
        "bg-white/90 backdrop-blur-sm hover:bg-white shadow-md",
        "text-xs font-medium text-gray-700 hover:text-gray-900",
        "transition-all duration-200 hover:scale-105 active:scale-95",
        className
      )}
      aria-label={t.quickView.button}
    >
      <Eye size={14} />
      <span>{t.quickView.button}</span>
    </button>
  )
}
