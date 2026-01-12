"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Zap, ChevronRight, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  FlashSaleCountdown,
  FlashSaleBadge,
  FlashSalePrice,
} from "@/components/flash-sale-countdown"

interface FlashSaleProduct {
  id: string
  nameEn: string
  nameKh: string
  priceUsd: number
  priceKhr: number
  imageUrl: string | null
  category: {
    nameEn: string
    nameKh: string
  }
}

interface FlashSaleData {
  id: string
  salePriceUsd: number
  salePriceKhr: number
  startTime: string
  endTime: string
  quantity: number | null
  soldCount: number
  remainingQuantity: number | null
  nameEn: string | null
  nameKh: string | null
  descriptionEn: string | null
  descriptionKh: string | null
  isFeatured: boolean
  bannerImageUrl: string | null
  product: FlashSaleProduct | null
}

interface FlashSaleBannerProps {
  language?: "EN" | "KH"
  currency?: "USD" | "KHR"
  className?: string
}

const translations = {
  en: {
    flashSale: "Flash Sale",
    limitedTime: "Limited Time Offer",
    shopNow: "Shop Now",
    viewAll: "View All Deals",
    remaining: "remaining",
    soldOut: "Sold Out",
    off: "OFF",
  },
  kh: {
    flashSale: "ការលក់ភ្លាម",
    limitedTime: "ការផ្តល់ជូនមានពេលកំណត់",
    shopNow: "ទិញឥឡូវ",
    viewAll: "មើលការផ្តល់ជូនទាំងអស់",
    remaining: "នៅសល់",
    soldOut: "អស់ស្តុក",
    off: "បញ្ចុះ",
  },
}

export function FlashSaleBanner({
  language = "EN",
  currency = "USD",
  className = "",
}: FlashSaleBannerProps) {
  const [flashSales, setFlashSales] = useState<FlashSaleData[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)

  const t = translations[language === "EN" ? "en" : "kh"]

  useEffect(() => {
    async function fetchFlashSales() {
      try {
        const response = await fetch("/api/flash-sales?active=true&featured=true&limit=5")
        if (response.ok) {
          const data = await response.json()
          setFlashSales(data.flashSales || [])
        }
      } catch (error) {
        console.error("Error fetching flash sales:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchFlashSales()
  }, [])

  // Auto-rotate featured sales
  useEffect(() => {
    if (flashSales.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % flashSales.length)
    }, 8000)

    return () => clearInterval(interval)
  }, [flashSales.length])

  if (loading) {
    return (
      <div
        className={`h-48 animate-pulse rounded-xl bg-gradient-to-r from-orange-200 to-red-200 dark:from-orange-950 dark:to-red-950 ${className}`}
      />
    )
  }

  if (flashSales.length === 0) {
    return null
  }

  const currentSale = flashSales[currentIndex]
  const product = currentSale.product

  if (!product) return null

  const discountPercentage = Math.round(
    ((product.priceUsd - currentSale.salePriceUsd) / product.priceUsd) * 100
  )
  const productName = language === "EN" ? product.nameEn : product.nameKh
  const saleName =
    (language === "EN" ? currentSale.nameEn : currentSale.nameKh) ||
    t.flashSale
  const saleDescription =
    language === "EN"
      ? currentSale.descriptionEn
      : currentSale.descriptionKh

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 ${className}`}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYtMi42ODYgNi02cy0yLjY4Ni02LTYtNi02IDIuNjg2LTYgNiAyLjY4NiA2IDYgNnptMCAwYzMuMzE0IDAgNi0yLjY4NiA2LTZzLTIuNjg2LTYtNi02LTYgMi42ODYtNiA2IDIuNjg2IDYgNiA2eiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L3N2Zz4=')] opacity-30" />

      <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        {/* Product Image */}
        <div className="relative mx-auto h-32 w-32 flex-shrink-0 sm:mx-0 sm:h-40 sm:w-40">
          <div className="absolute -inset-2 animate-pulse rounded-full bg-white/20 blur-xl" />
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={productName}
              fill
              className="relative rounded-lg object-cover shadow-xl"
            />
          ) : (
            <div className="relative flex h-full w-full items-center justify-center rounded-lg bg-white/20">
              <Zap className="h-12 w-12 text-white" />
            </div>
          )}
          <FlashSaleBadge
            discountPercentage={discountPercentage}
            language={language}
            className="absolute -right-2 -top-2"
          />
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col items-center text-center sm:items-start sm:text-left">
          {/* Header */}
          <div className="mb-2 flex items-center gap-2">
            <Zap className="h-5 w-5 animate-pulse text-yellow-300" />
            <span className="text-sm font-bold uppercase tracking-wider text-white/90">
              {saleName}
            </span>
          </div>

          {/* Product Name */}
          <h3 className="mb-1 text-xl font-bold text-white sm:text-2xl">
            {productName}
          </h3>

          {/* Description */}
          {saleDescription && (
            <p className="mb-3 text-sm text-white/80 line-clamp-2">
              {saleDescription}
            </p>
          )}

          {/* Pricing */}
          <div className="mb-3">
            <FlashSalePrice
              originalPriceUsd={product.priceUsd}
              originalPriceKhr={product.priceKhr}
              salePriceUsd={currentSale.salePriceUsd}
              salePriceKhr={currentSale.salePriceKhr}
              currency={currency}
              language={language}
              size="lg"
              className="[&>span:first-child]:text-white [&>span:last-child]:text-white/60"
            />
          </div>

          {/* Countdown */}
          <FlashSaleCountdown
            endTime={currentSale.endTime}
            language={language}
            variant="banner"
            className="mb-4"
          />

          {/* Stock indicator */}
          {currentSale.remainingQuantity !== null && (
            <div className="mb-4 w-full max-w-xs">
              <div className="mb-1 flex justify-between text-xs text-white/80">
                <span>
                  {currentSale.remainingQuantity} {t.remaining}
                </span>
                <span>{currentSale.soldCount} sold</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/30">
                <div
                  className="h-full bg-yellow-400 transition-all duration-500"
                  style={{
                    width: `${
                      ((currentSale.quantity! - currentSale.remainingQuantity) /
                        currentSale.quantity!) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* CTA Button */}
          <Link href={`/shop/product/${product.id}`}>
            <Button
              size="lg"
              className="gap-2 bg-white text-orange-600 hover:bg-white/90"
            >
              {t.shopNow}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Pagination dots */}
        {flashSales.length > 1 && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 sm:bottom-6">
            {flashSales.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? "w-6 bg-white"
                    : "w-2 bg-white/50 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Compact flash sale card for product grid
interface FlashSaleCardProps {
  flashSale: FlashSaleData
  language?: "EN" | "KH"
  currency?: "USD" | "KHR"
  className?: string
}

export function FlashSaleCard({
  flashSale,
  language = "EN",
  currency = "USD",
  className = "",
}: FlashSaleCardProps) {
  const product = flashSale.product
  const t = translations[language === "EN" ? "en" : "kh"]

  if (!product) return null

  const discountPercentage = Math.round(
    ((product.priceUsd - flashSale.salePriceUsd) / product.priceUsd) * 100
  )
  const productName = language === "EN" ? product.nameEn : product.nameKh

  return (
    <Link
      href={`/shop/product/${product.id}`}
      className={`group relative block overflow-hidden rounded-lg border bg-card transition-all hover:shadow-lg ${className}`}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={productName}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <Zap className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <FlashSaleBadge
          discountPercentage={discountPercentage}
          language={language}
          className="absolute left-2 top-2"
        />
      </div>

      {/* Content */}
      <div className="p-3">
        <h4 className="mb-1 truncate text-sm font-medium">{productName}</h4>
        <FlashSalePrice
          originalPriceUsd={product.priceUsd}
          originalPriceKhr={product.priceKhr}
          salePriceUsd={flashSale.salePriceUsd}
          salePriceKhr={flashSale.salePriceKhr}
          currency={currency}
          language={language}
          size="sm"
        />
        <FlashSaleCountdown
          endTime={flashSale.endTime}
          language={language}
          variant="compact"
          showIcon={false}
          className="mt-2"
        />
      </div>
    </Link>
  )
}
