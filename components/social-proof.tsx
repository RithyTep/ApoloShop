"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  X,
  ShoppingBag,
  Users,
  Shield,
  Award,
  Truck,
  Eye,
  BadgeCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { translations } from "@/lib/i18n"

// Types for social proof data
interface PurchaseNotification {
  id: string
  customerName: string
  productId: string | null
  productName: string
  productNameKh: string
  productImage: string | null
  quantity: number
  timeAgo: { en: string; kh: string }
  createdAt: string
}

interface SocialProofConfig {
  showRecentPurchases: boolean
  purchaseDisplayDelay: number
  purchaseDisplayDuration: number
  showViewerCount: boolean
  showSoldCount: boolean
  showTrustBadges: boolean
  enabledBadges: string[]
  notificationPosition: string
}

interface ProductStats {
  soldCount: number
  viewerCount: number
}

interface SocialProofData {
  config: SocialProofConfig
  recentPurchases: PurchaseNotification[]
  productStats: ProductStats | null
}

interface SocialProofNotificationProps {
  language?: "EN" | "KH"
  className?: string
}

// Recent purchase notification popup component
export function SocialProofNotification({
  language = "EN",
  className = "",
}: SocialProofNotificationProps) {
  const [data, setData] = useState<SocialProofData | null>(null)
  const [currentNotification, setCurrentNotification] =
    useState<PurchaseNotification | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [notificationIndex, setNotificationIndex] = useState(0)
  const [isDismissed, setIsDismissed] = useState(false)

  const t =
    translations[language === "EN" ? "en" : "kh"].socialProof ||
    translations.en.socialProof

  // Fetch social proof data
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/social-proof")
        if (response.ok) {
          const result = await response.json()
          setData(result)
        }
      } catch (error) {
        console.error("Error fetching social proof data:", error)
      }
    }

    fetchData()
    // Refresh data every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Cycle through notifications
  useEffect(() => {
    if (
      !data?.config.showRecentPurchases ||
      data.recentPurchases.length === 0 ||
      isDismissed
    ) {
      return
    }

    const displayDelay = data.config.purchaseDisplayDelay * 1000
    const displayDuration = data.config.purchaseDisplayDuration * 1000

    // Show notification after delay
    const showTimer = setTimeout(() => {
      const notification = data.recentPurchases[notificationIndex]
      setCurrentNotification(notification)
      setIsVisible(true)
    }, displayDelay)

    return () => clearTimeout(showTimer)
  }, [data, notificationIndex, isDismissed])

  // Hide notification after duration
  useEffect(() => {
    if (!isVisible || !data) return

    const displayDuration = data.config.purchaseDisplayDuration * 1000

    const hideTimer = setTimeout(() => {
      setIsVisible(false)

      // Move to next notification
      setTimeout(() => {
        setNotificationIndex((prev) =>
          data.recentPurchases.length > 0
            ? (prev + 1) % data.recentPurchases.length
            : 0
        )
      }, 500) // Wait for fade out animation
    }, displayDuration)

    return () => clearTimeout(hideTimer)
  }, [isVisible, data])

  const handleDismiss = useCallback(() => {
    setIsVisible(false)
    setIsDismissed(true)
  }, [])

  if (!data?.config.showRecentPurchases || !currentNotification || isDismissed) {
    return null
  }

  // Position classes based on config
  const positionClasses: Record<string, string> = {
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
    "top-left": "top-20 left-4",
    "top-right": "top-20 right-4",
  }

  const position =
    positionClasses[data.config.notificationPosition] || positionClasses["bottom-left"]

  return (
    <div
      className={`fixed z-50 ${position} transition-all duration-500 ${
        isVisible
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0 pointer-events-none"
      } ${className}`}
    >
      <div className="flex items-start gap-3 rounded-lg border bg-background p-3 shadow-lg max-w-xs sm:max-w-sm">
        {/* Product image */}
        <div className="relative h-12 w-12 flex-shrink-0 rounded-md overflow-hidden bg-muted">
          {currentNotification.productImage ? (
            <Image
              src={currentNotification.productImage}
              alt={currentNotification.productName}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ShoppingBag className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            <span className="font-semibold">
              {currentNotification.customerName}
            </span>{" "}
            {t?.purchased || "purchased"}
          </p>
          {currentNotification.productId ? (
            <Link
              href={`/shop/product/${currentNotification.productId}`}
              className="text-sm text-primary hover:underline truncate block"
            >
              {language === "EN"
                ? currentNotification.productName
                : currentNotification.productNameKh}
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground truncate">
              {language === "EN"
                ? currentNotification.productName
                : currentNotification.productNameKh}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            {language === "EN"
              ? currentNotification.timeAgo.en
              : currentNotification.timeAgo.kh}
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 rounded-full p-1 hover:bg-muted transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}

// Product page social proof indicators (viewers, sold count)
interface ProductSocialProofProps {
  productId: string
  language?: "EN" | "KH"
  className?: string
}

export function ProductSocialProof({
  productId,
  language = "EN",
  className = "",
}: ProductSocialProofProps) {
  const [data, setData] = useState<SocialProofData | null>(null)
  const [loading, setLoading] = useState(true)

  const t =
    translations[language === "EN" ? "en" : "kh"].socialProof ||
    translations.en.socialProof

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/social-proof?productId=${productId}`)
        if (response.ok) {
          const result = await response.json()
          setData(result)
        }
      } catch (error) {
        console.error("Error fetching product social proof:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    // Refresh viewer count every 30 seconds for dynamic feel
    const interval = setInterval(fetchData, 30 * 1000)
    return () => clearInterval(interval)
  }, [productId])

  if (loading || !data) {
    return null
  }

  const { config, productStats } = data

  if (!productStats) return null

  return (
    <div className={`flex flex-wrap gap-3 text-sm ${className}`}>
      {/* Currently viewing */}
      {config.showViewerCount && productStats.viewerCount > 0 && (
        <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
          <Eye className="h-4 w-4" />
          <span>
            {productStats.viewerCount} {t?.peopleViewing || "people viewing"}
          </span>
        </div>
      )}

      {/* Items sold */}
      {config.showSoldCount && productStats.soldCount > 0 && (
        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
          <ShoppingBag className="h-4 w-4" />
          <span>
            {productStats.soldCount} {t?.sold || "sold"}
          </span>
        </div>
      )}
    </div>
  )
}

// Trust badges component for checkout/footer
interface TrustBadgesProps {
  language?: "EN" | "KH"
  variant?: "horizontal" | "vertical" | "grid"
  showLabels?: boolean
  className?: string
}

export function TrustBadges({
  language = "EN",
  variant = "horizontal",
  showLabels = true,
  className = "",
}: TrustBadgesProps) {
  const [config, setConfig] = useState<SocialProofConfig | null>(null)

  const t =
    translations[language === "EN" ? "en" : "kh"].socialProof ||
    translations.en.socialProof

  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch("/api/social-proof")
        if (response.ok) {
          const result = await response.json()
          setConfig(result.config)
        }
      } catch (error) {
        console.error("Error fetching trust badge config:", error)
      }
    }

    fetchConfig()
  }, [])

  if (!config?.showTrustBadges) {
    return null
  }

  const enabledBadges = config.enabledBadges as string[]

  // Badge definitions
  const badgeDefinitions: Record<
    string,
    { icon: React.ReactNode; labelEn: string; labelKh: string }
  > = {
    secure: {
      icon: <Shield className="h-5 w-5" />,
      labelEn: "Secure Checkout",
      labelKh: "ការទូទាត់ប្រកបដោយសុវត្ថិភាព",
    },
    guarantee: {
      icon: <Award className="h-5 w-5" />,
      labelEn: "Money-Back Guarantee",
      labelKh: "ធានាប្រាក់កម្រៃវិញ",
    },
    shipping: {
      icon: <Truck className="h-5 w-5" />,
      labelEn: "Fast Delivery",
      labelKh: "ដឹកជញ្ជូនរហ័ស",
    },
    verified: {
      icon: <BadgeCheck className="h-5 w-5" />,
      labelEn: "Verified Seller",
      labelKh: "អ្នកលក់បានផ្ទៀងផ្ទាត់",
    },
    support: {
      icon: <Users className="h-5 w-5" />,
      labelEn: "24/7 Support",
      labelKh: "គាំទ្រ 24/7",
    },
  }

  const badges = enabledBadges
    .filter((id) => badgeDefinitions[id])
    .map((id) => ({
      id,
      ...badgeDefinitions[id],
    }))

  if (badges.length === 0) return null

  // Layout classes based on variant
  const layoutClasses: Record<string, string> = {
    horizontal: "flex flex-wrap items-center justify-center gap-4 sm:gap-6",
    vertical: "flex flex-col gap-3",
    grid: "grid grid-cols-2 sm:grid-cols-3 gap-4",
  }

  return (
    <div className={`${layoutClasses[variant]} ${className}`}>
      {badges.map((badge) => (
        <div
          key={badge.id}
          className={`flex items-center gap-2 ${
            variant === "vertical" ? "" : "justify-center"
          }`}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            {badge.icon}
          </div>
          {showLabels && (
            <span className="text-sm font-medium text-muted-foreground">
              {language === "EN" ? badge.labelEn : badge.labelKh}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// Compact trust strip for checkout pages
interface TrustStripProps {
  language?: "EN" | "KH"
  className?: string
}

export function TrustStrip({ language = "EN", className = "" }: TrustStripProps) {
  const t =
    translations[language === "EN" ? "en" : "kh"].socialProof ||
    translations.en.socialProof

  return (
    <div
      className={`flex items-center justify-center gap-6 py-3 border-t border-b bg-muted/30 text-xs text-muted-foreground ${className}`}
    >
      <div className="flex items-center gap-1.5">
        <Shield className="h-4 w-4 text-green-600" />
        <span>{t?.securePayment || "Secure Payment"}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Truck className="h-4 w-4 text-blue-600" />
        <span>{t?.fastDelivery || "Fast Delivery"}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Award className="h-4 w-4 text-amber-600" />
        <span>{t?.qualityGuarantee || "Quality Guarantee"}</span>
      </div>
    </div>
  )
}
