"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Store,
  MapPin,
  Calendar,
  Clock,
  Phone,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Loader2,
} from "lucide-react"
import { translations } from "@/lib/i18n"
import { format } from "date-fns"

interface PickupDetails {
  id: string
  orderId: string
  verificationCode: string
  qrCodeData: string | null
  status: string
  scheduledDate: string
  customerName: string
  customerPhone: string | null
  customerNotes: string | null
  store: {
    id: string
    name: string
    nameKh: string | null
    address: string
    addressKh: string | null
    phone: string | null
    lat: number
    lng: number
  }
  timeSlot: {
    startTime: string
    endTime: string
  } | null
  statusHistory: Array<{
    status: string
    notes: string | null
    createdAt: string
  }>
}

interface PickupVerificationProps {
  orderId: string
  language: "EN" | "KH"
}

const getStatusVariant = (status: string): "warning" | "info" | "success" | "secondary" | "destructive" => {
  const statusMap: Record<string, "warning" | "info" | "success" | "secondary" | "destructive"> = {
    PENDING: "warning",
    CONFIRMED: "info",
    PREPARING: "warning",
    READY: "success",
    PICKED_UP: "secondary",
    CANCELLED: "destructive",
    EXPIRED: "warning",
  }
  return statusMap[status] || "secondary"
}

export function PickupVerification({ orderId, language }: PickupVerificationProps) {
  const [pickup, setPickup] = useState<PickupDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)

  const t = translations[language === "EN" ? "en" : "kh"]
  const tp = t.storePickup

  useEffect(() => {
    async function fetchPickup() {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/store-pickup?action=order&orderId=${orderId}`)
        if (response.ok) {
          const data = await response.json()
          setPickup(data.pickup)
        } else if (response.status === 404) {
          // No pickup for this order - that's okay
          setPickup(null)
        } else {
          setError("Failed to load pickup details")
        }
      } catch (err) {
        setError("Failed to load pickup details")
      } finally {
        setIsLoading(false)
      }
    }

    if (orderId) {
      fetchPickup()
    }
  }, [orderId])

  // Generate QR code when showing
  const generateQRCode = useCallback(async () => {
    if (!pickup) return
    setQrLoading(true)
    try {
      const response = await fetch(`/api/store-pickup/qr?code=${pickup.verificationCode}`)
      if (response.ok) {
        const blob = await response.blob()
        setQrCodeUrl(URL.createObjectURL(blob))
      }
    } catch (err) {
      console.error("Failed to generate QR code:", err)
    } finally {
      setQrLoading(false)
    }
  }, [pickup])

  useEffect(() => {
    if (showQR && !qrCodeUrl && pickup) {
      generateQRCode()
    }
  }, [showQR, qrCodeUrl, pickup, generateQRCode])

  const handleCopyCode = async () => {
    if (pickup?.verificationCode) {
      await navigator.clipboard.writeText(pickup.verificationCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleGetDirections = () => {
    if (pickup?.store) {
      const { lat, lng, name } = pickup.store
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(name)}`,
        "_blank"
      )
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading pickup details...
        </CardContent>
      </Card>
    )
  }

  if (error || !pickup) {
    return null // No pickup for this order
  }

  const storeName =
    language === "KH" && pickup.store.nameKh
      ? pickup.store.nameKh
      : pickup.store.name
  const storeAddress =
    language === "KH" && pickup.store.addressKh
      ? pickup.store.addressKh
      : pickup.store.address

  const statusKey = pickup.status as keyof typeof tp.status
  const statusText = tp.status[statusKey] || pickup.status

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-primary/5 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Store className="h-5 w-5" />
            {tp.orderPickup}
          </CardTitle>
          <Badge variant={getStatusVariant(pickup.status)}>
            {statusText}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-6">
        {/* QR Code Section */}
        <div className="text-center space-y-3">
          {showQR ? (
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 bg-white rounded-lg shadow-inner border min-h-[200px] flex items-center justify-center">
                {qrLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="Pickup QR Code"
                    width={180}
                    height={180}
                  />
                ) : (
                  <div className="text-4xl font-mono font-bold tracking-widest">
                    {pickup.verificationCode}
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {tp.scanToVerify}
              </p>
              <Button variant="outline" size="sm" onClick={() => setShowQR(false)}>
                Hide QR
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => setShowQR(true)}
            >
              <QrCode className="h-5 w-5 mr-2" />
              {tp.showQRCode}
            </Button>
          )}

          {/* Verification Code */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">
              {tp.verificationCode}:
            </span>
            <code className="bg-muted px-3 py-1 rounded text-lg font-mono font-bold tracking-wider">
              {pickup.verificationCode}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleCopyCode}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Pickup Details */}
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-start gap-3">
            <Store className="h-5 w-5 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">{storeName}</p>
              <p className="text-sm text-muted-foreground">{storeAddress}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <span className="text-sm text-muted-foreground">{tp.scheduledFor}: </span>
              <span className="font-medium">
                {format(new Date(pickup.scheduledDate), "EEEE, MMMM d, yyyy")}
              </span>
            </div>
          </div>

          {pickup.timeSlot && (
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">
                {pickup.timeSlot.startTime} - {pickup.timeSlot.endTime}
              </span>
            </div>
          )}

          {pickup.store.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{tp.storeContact}: </span>
                <a href={`tel:${pickup.store.phone}`} className="font-medium text-primary">
                  {pickup.store.phone}
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Customer Notes */}
        {pickup.customerNotes && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-1">{tp.customerNotes}:</p>
            <p className="text-sm bg-muted/50 p-2 rounded">{pickup.customerNotes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 border-t flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleGetDirections}
          >
            <MapPin className="h-4 w-4 mr-2" />
            {tp.getDirections}
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
          {pickup.store.phone && (
            <Button
              variant="outline"
              className="flex-1"
              asChild
            >
              <a href={`tel:${pickup.store.phone}`}>
                <Phone className="h-4 w-4 mr-2" />
                Call Store
              </a>
            </Button>
          )}
        </div>

        {/* Status History */}
        {pickup.statusHistory.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">{tp.pickupStatus}</p>
            <div className="space-y-2">
              {pickup.statusHistory.map((history, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-sm"
                >
                  <div className="h-2 w-2 mt-1.5 rounded-full bg-primary" />
                  <div className="flex-1">
                    <span className="font-medium">
                      {tp.status[history.status as keyof typeof tp.status] || history.status}
                    </span>
                    {history.notes && (
                      <span className="text-muted-foreground"> - {history.notes}</span>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(history.createdAt), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
