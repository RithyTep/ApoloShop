"use client"

import { useState, useEffect } from "react"
import { Truck, Clock, Calendar, MapPin, ChevronDown, ChevronUp, Zap } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { translations } from "@/lib/i18n"

interface DeliveryEstimateData {
  zoneId: string
  zoneName: { en: string; kh: string }
  estimatedRange: {
    earliest: string
    latest: string
    earliestFormatted: { en: string; kh: string }
    latestFormatted: { en: string; kh: string }
  }
  businessDays: {
    min: number
    max: number
  }
  isExpress: boolean
  shippingMethod: string
}

interface DeliveryEstimateResponse {
  available: boolean
  orderDate: string
  processDate: string
  processesToday: boolean
  estimates?: DeliveryEstimateData[]
  fastestOption?: DeliveryEstimateData
  estimate?: DeliveryEstimateData
}

interface DeliveryEstimateProps {
  region?: string
  language?: "EN" | "KH"
  showAllOptions?: boolean
  compact?: boolean
}

export function DeliveryEstimate({
  region,
  language = "EN",
  showAllOptions = false,
  compact = false,
}: DeliveryEstimateProps) {
  const [data, setData] = useState<DeliveryEstimateResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const t = translations[language === "EN" ? "en" : "kh"]
  const deliveryT = t.delivery || {
    estimatedDelivery: language === "EN" ? "Estimated Delivery" : "ការប៉ាន់ប្រមាណពេលដឹកជញ្ជូន",
    orderBy: language === "EN" ? "Order within" : "បញ្ជាទិញក្នុង",
    toGetBy: language === "EN" ? "to get it by" : "ដើម្បីទទួលបាន",
    businessDays: language === "EN" ? "business days" : "ថ្ងៃធ្វើការ",
    express: language === "EN" ? "Express" : "រហ័ស",
    standard: language === "EN" ? "Standard" : "ធម្មតា",
    freeShipping: language === "EN" ? "Free Shipping" : "ដឹកជញ្ជូនឥតគិតថ្លៃ",
    deliveryTo: language === "EN" ? "Delivery to" : "ដឹកជញ្ជូនទៅ",
    moreOptions: language === "EN" ? "More shipping options" : "ជម្រើសដឹកជញ្ជូនផ្សេងទៀត",
    hideOptions: language === "EN" ? "Hide options" : "លាក់ជម្រើស",
    unavailable: language === "EN" ? "Delivery estimate unavailable" : "មិនមានការប៉ាន់ប្រមាណពេលដឹកជញ្ជូន",
    processingToday: language === "EN" ? "Processing today" : "កំពុងដំណើរការថ្ងៃនេះ",
  }

  useEffect(() => {
    const fetchEstimate = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        if (region) params.append("region", region)

        const response = await fetch(`/api/delivery-estimate?${params.toString()}`)
        if (!response.ok) throw new Error("Failed to fetch delivery estimate")

        const result = await response.json()
        setData(result)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error fetching estimate")
      } finally {
        setLoading(false)
      }
    }

    fetchEstimate()
  }, [region])

  if (loading) {
    return compact ? (
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
      </div>
    ) : (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </Card>
    )
  }

  if (error || !data || !data.available) {
    if (compact) return null
    return (
      <Card className="p-4 border-muted">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Truck className="h-4 w-4" />
          <span>{deliveryT.unavailable}</span>
        </div>
      </Card>
    )
  }

  const primaryEstimate = data.fastestOption || data.estimate
  if (!primaryEstimate) return null

  const { estimatedRange, businessDays, isExpress, shippingMethod } = primaryEstimate
  const zoneName = language === "EN" ? primaryEstimate.zoneName.en : primaryEstimate.zoneName.kh
  const earliestDate = language === "EN" ? estimatedRange.earliestFormatted.en : estimatedRange.earliestFormatted.kh
  const latestDate = language === "EN" ? estimatedRange.latestFormatted.en : estimatedRange.latestFormatted.kh

  // Determine badge and method label
  let methodLabel = deliveryT.standard
  let methodBadge = null
  if (isExpress) {
    methodLabel = deliveryT.express
    methodBadge = (
      <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs">
        <Zap className="h-3 w-3 mr-1" />
        {deliveryT.express}
      </Badge>
    )
  } else if (shippingMethod === "free_shipping") {
    methodLabel = deliveryT.freeShipping
    methodBadge = (
      <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
        {deliveryT.freeShipping}
      </Badge>
    )
  }

  // Compact display for inline use
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Truck className="h-4 w-4 text-green-600" />
        <span>
          {businessDays.min === businessDays.max
            ? `${businessDays.min} ${deliveryT.businessDays}`
            : `${businessDays.min}-${businessDays.max} ${deliveryT.businessDays}`}
        </span>
        {isExpress && (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs px-1.5 py-0">
            <Zap className="h-2.5 w-2.5" />
          </Badge>
        )}
      </div>
    )
  }

  // Full display for product pages
  return (
    <Card className="p-4 border-green-200 bg-green-50/50">
      <div className="space-y-3">
        {/* Primary estimate */}
        <div className="flex items-start gap-3">
          <div className="p-2 bg-green-100 rounded-full">
            <Truck className="h-5 w-5 text-green-700" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-foreground">
                {deliveryT.estimatedDelivery}:
              </span>
              {methodBadge}
            </div>
            <p className="text-lg font-semibold text-green-700 mt-1">
              {earliestDate === latestDate ? (
                earliestDate
              ) : (
                <>
                  {earliestDate} - {latestDate}
                </>
              )}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {businessDays.min === businessDays.max
                ? `${businessDays.min} ${deliveryT.businessDays}`
                : `${businessDays.min}-${businessDays.max} ${deliveryT.businessDays}`}
            </p>
          </div>
        </div>

        {/* Processing status */}
        {data.processesToday && (
          <div className="flex items-center gap-2 text-sm text-green-700">
            <Clock className="h-4 w-4" />
            <span>{deliveryT.processingToday}</span>
          </div>
        )}

        {/* Region indicator */}
        {region && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{deliveryT.deliveryTo}: {zoneName}</span>
          </div>
        )}

        {/* More options toggle */}
        {showAllOptions && data.estimates && data.estimates.length > 1 && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  {deliveryT.hideOptions}
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  {deliveryT.moreOptions} ({data.estimates.length - 1})
                </>
              )}
            </button>

            {expanded && (
              <div className="space-y-2 pt-2 border-t border-green-200">
                {data.estimates
                  .filter((e) => e.zoneId !== primaryEstimate.zoneId)
                  .map((estimate) => {
                    const estEarliest = language === "EN"
                      ? estimate.estimatedRange.earliestFormatted.en
                      : estimate.estimatedRange.earliestFormatted.kh
                    const estLatest = language === "EN"
                      ? estimate.estimatedRange.latestFormatted.en
                      : estimate.estimatedRange.latestFormatted.kh
                    const estZoneName = language === "EN"
                      ? estimate.zoneName.en
                      : estimate.zoneName.kh

                    return (
                      <div
                        key={estimate.zoneId}
                        className="flex items-center justify-between text-sm p-2 bg-white rounded border"
                      >
                        <div>
                          <span className="font-medium">{estZoneName}</span>
                          <span className="text-muted-foreground ml-2">
                            ({estimate.businessDays.min}-{estimate.businessDays.max} {deliveryT.businessDays})
                          </span>
                        </div>
                        <span className="text-green-700">
                          {estEarliest === estLatest ? estEarliest : `${estEarliest} - ${estLatest}`}
                        </span>
                      </div>
                    )
                  })}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  )
}

// Simple inline version for use in product cards
export function DeliveryEstimateInline({
  minDays = 2,
  maxDays = 5,
  language = "EN",
}: {
  minDays?: number
  maxDays?: number
  language?: "EN" | "KH"
}) {
  const businessDaysLabel = language === "EN" ? "business days" : "ថ្ងៃធ្វើការ"

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Truck className="h-3 w-3" />
      <span>
        {minDays === maxDays
          ? `${minDays} ${businessDaysLabel}`
          : `${minDays}-${maxDays} ${businessDaysLabel}`}
      </span>
    </div>
  )
}
