"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  AlertCircle,
  Search,
  ArrowRight,
  RotateCcw
} from "lucide-react"
import { useTrackingLookup, TrackingStatus, CourierProvider } from "@/lib/api-hooks"
import { useLanguage } from "@/lib/shop-context"
import { translations } from "@/lib/i18n"

const statusIcons: Record<TrackingStatus, typeof Package> = {
  PENDING: Clock,
  PICKED_UP: Package,
  IN_TRANSIT: Truck,
  OUT_FOR_DELIVERY: Truck,
  DELIVERED: CheckCircle,
  FAILED_DELIVERY: AlertCircle,
  RETURNED: RotateCcw,
}

const statusColors: Record<TrackingStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  PICKED_UP: "bg-blue-100 text-blue-800 border-blue-200",
  IN_TRANSIT: "bg-purple-100 text-purple-800 border-purple-200",
  OUT_FOR_DELIVERY: "bg-orange-100 text-orange-800 border-orange-200",
  DELIVERED: "bg-green-100 text-green-800 border-green-200",
  FAILED_DELIVERY: "bg-red-100 text-red-800 border-red-200",
  RETURNED: "bg-gray-100 text-gray-800 border-gray-200",
}

function getStatusLabel(status: TrackingStatus, t: typeof translations.en.tracking) {
  const labels: Record<TrackingStatus, string> = {
    PENDING: t.statusPending,
    PICKED_UP: t.statusPickedUp,
    IN_TRANSIT: t.statusInTransit,
    OUT_FOR_DELIVERY: t.statusOutForDelivery,
    DELIVERED: t.statusDelivered,
    FAILED_DELIVERY: t.statusFailedDelivery,
    RETURNED: t.statusReturned,
  }
  return labels[status]
}

function getCourierLabel(courier: CourierProvider, t: typeof translations.en.tracking) {
  const labels: Record<CourierProvider, string> = {
    JT_EXPRESS: t.courierJtExpress,
    NINJA_VAN: t.courierNinjaVan,
    WING_DELIVERY: t.courierWingDelivery,
    OTHER: t.courierOther,
  }
  return labels[courier]
}

export default function TrackOrderPage() {
  const { language } = useLanguage()
  const t = translations[language === "EN" ? "en" : "kh"].tracking

  const [searchValue, setSearchValue] = useState("")
  const [searchType, setSearchType] = useState<"orderNumber" | "trackingNumber">("orderNumber")
  const [activeSearch, setActiveSearch] = useState<{ orderNumber?: string; trackingNumber?: string } | null>(null)

  const { data: tracking, isLoading, error, isError } = useTrackingLookup(activeSearch || {})

  const handleSearch = () => {
    if (!searchValue.trim()) return

    if (searchType === "orderNumber") {
      setActiveSearch({ orderNumber: searchValue.trim() })
    } else {
      setActiveSearch({ trackingNumber: searchValue.trim() })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === "KH" ? "km-KH" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <main className="pt-24 pb-12 px-4 min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>

        {/* Search Card */}
        <Card className="p-6">
          <div className="space-y-4">
            {/* Search Type Toggle */}
            <div className="flex gap-2">
              <Button
                variant={searchType === "orderNumber" ? "default" : "outline"}
                size="sm"
                onClick={() => setSearchType("orderNumber")}
              >
                {t.orderNumber}
              </Button>
              <Button
                variant={searchType === "trackingNumber" ? "default" : "outline"}
                size="sm"
                onClick={() => setSearchType("trackingNumber")}
              >
                {t.trackingNumber}
              </Button>
            </div>

            {/* Search Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={searchType === "orderNumber" ? "ORD-20260101-001" : "JT123456789"}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSearch} disabled={isLoading || !searchValue.trim()}>
                {t.trackButton}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Card className="p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </Card>
        )}

        {/* Error State */}
        {isError && (
          <Card className="p-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{t.notFound}</h3>
              <p className="text-muted-foreground">{t.notFoundDesc}</p>
            </div>
          </Card>
        )}

        {/* Tracking Result */}
        {tracking && !isLoading && (
          <div className="space-y-6">
            {/* Status Card */}
            <Card className="p-6">
              <div className="space-y-6">
                {/* Current Status */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.status}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {(() => {
                        const StatusIcon = statusIcons[tracking.status]
                        return <StatusIcon className="h-5 w-5" />
                      })()}
                      <Badge className={`${statusColors[tracking.status]} border`}>
                        {getStatusLabel(tracking.status, t)}
                      </Badge>
                    </div>
                  </div>
                  {tracking.trackingNumber && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{t.trackingNumberLabel}</p>
                      <p className="font-mono font-medium">{tracking.trackingNumber}</p>
                    </div>
                  )}
                </div>

                {/* Courier & Delivery Info */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.courier}</p>
                    <p className="font-medium">
                      {tracking.courierName || getCourierLabel(tracking.courier, t)}
                    </p>
                  </div>
                  {tracking.estimatedDeliveryDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t.estimatedDelivery}</p>
                      <p className="font-medium">{formatDate(tracking.estimatedDeliveryDate)}</p>
                    </div>
                  )}
                  {tracking.actualDeliveryDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t.actualDelivery}</p>
                      <p className="font-medium text-green-600">{formatDate(tracking.actualDeliveryDate)}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Order Details Card */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">{t.orderDetails}</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t.orderNumber}</span>
                  <span className="font-mono">{tracking.order.orderNumber}</span>
                </div>
                <div className="border-t pt-3">
                  <p className="text-sm text-muted-foreground mb-2">{t.items}</p>
                  <div className="space-y-2">
                    {tracking.order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{language === "KH" && item.nameKh ? item.nameKh : item.name}</span>
                        <span className="text-muted-foreground">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Status History Card */}
            {tracking.statusHistory && tracking.statusHistory.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold mb-4">{t.statusHistory}</h3>
                <div className="space-y-4">
                  {tracking.statusHistory.map((history, idx) => {
                    const StatusIcon = statusIcons[history.status]
                    const isLatest = idx === 0

                    return (
                      <div key={idx} className="relative flex gap-4">
                        {/* Timeline line */}
                        {idx < tracking.statusHistory!.length - 1 && (
                          <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-border" />
                        )}

                        {/* Status icon */}
                        <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          isLatest ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}>
                          <StatusIcon className="h-4 w-4" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between">
                            <p className={`font-medium ${isLatest ? "" : "text-muted-foreground"}`}>
                              {getStatusLabel(history.status, t)}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(history.timestamp)}
                            </span>
                          </div>
                          {history.location && (
                            <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {history.location}
                            </div>
                          )}
                          {history.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{history.notes}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Empty State - no search yet */}
        {!activeSearch && !isLoading && (
          <Card className="p-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              {t.subtitle}
            </p>
          </Card>
        )}
      </div>
    </main>
  )
}
