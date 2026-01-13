"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Gift,
  Search,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
} from "lucide-react"
import { useLanguage, useCurrency } from "@/lib/shop-context"
import { translations } from "@/lib/i18n"

interface GiftCardBalance {
  code: string
  status: "ACTIVE" | "REDEEMED" | "EXPIRED" | "CANCELLED"
  currentBalance: number
  currency: "USD" | "KHR"
  expiresAt?: string
  message?: string
}

const statusIcons = {
  ACTIVE: CheckCircle,
  REDEEMED: CreditCard,
  EXPIRED: Clock,
  CANCELLED: XCircle,
}

const statusColors = {
  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  REDEEMED: "bg-gray-100 text-gray-800 border-gray-200",
  EXPIRED: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
}

export default function GiftCardBalancePage() {
  const { language } = useLanguage()
  const { currency } = useCurrency()
  const t = translations[language === "EN" ? "en" : "kh"].giftCard

  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [giftCard, setGiftCard] = useState<GiftCardBalance | null>(null)

  const formatCode = (value: string) => {
    // Remove all non-alphanumeric characters and convert to uppercase
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, "")
    // Add dashes every 4 characters
    const parts = clean.match(/.{1,4}/g) || []
    return parts.slice(0, 4).join("-")
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCode(e.target.value)
    setCode(formatted)
    // Clear previous results when typing
    if (giftCard || error) {
      setGiftCard(null)
      setError(null)
    }
  }

  const handleCheckBalance = async () => {
    if (!code.trim() || code.replace(/-/g, "").length < 16) {
      setError("Please enter a valid 16-character gift card code")
      return
    }

    setIsLoading(true)
    setError(null)
    setGiftCard(null)

    try {
      const response = await fetch(
        `/api/gift-cards?code=${encodeURIComponent(code)}&checkBalance=true`
      )
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to check balance")
        return
      }

      setGiftCard(data)
    } catch {
      setError("Failed to check gift card balance. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCheckBalance()
    }
  }

  const formatCurrency = (amount: number, curr: "USD" | "KHR") => {
    if (curr === "KHR") {
      return `៛${amount.toLocaleString()}`
    }
    return `$${amount.toFixed(2)}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === "KH" ? "km-KH" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getStatusLabel = (status: GiftCardBalance["status"]) => {
    const labels = {
      ACTIVE: t.active,
      REDEEMED: t.redeemed,
      EXPIRED: t.expired,
      CANCELLED: t.cancelled,
    }
    return labels[status]
  }

  return (
    <main className="pt-24 pb-12 px-4 min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Gift className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>

        {/* Search Card */}
        <Card className="p-6">
          <div className="space-y-4">
            <label className="text-sm font-medium">{t.enterCode}</label>
            {/* Search Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t.codePlaceholder}
                  value={code}
                  onChange={handleCodeChange}
                  onKeyDown={handleKeyDown}
                  className="pl-9 font-mono tracking-wider text-center uppercase"
                  maxLength={19} // XXXX-XXXX-XXXX-XXXX
                />
              </div>
              <Button
                onClick={handleCheckBalance}
                disabled={isLoading || code.replace(/-/g, "").length < 16}
              >
                {t.checkBalance}
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
          </Card>
        )}

        {/* Error State */}
        {error && (
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

        {/* Gift Card Result */}
        {giftCard && !isLoading && (
          <Card className="p-6">
            <div className="space-y-6">
              {/* Status Header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t.status}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {(() => {
                      const StatusIcon = statusIcons[giftCard.status]
                      return <StatusIcon className="h-5 w-5" />
                    })()}
                    <Badge className={`${statusColors[giftCard.status]} border`}>
                      {getStatusLabel(giftCard.status)}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Code</p>
                  <p className="font-mono font-medium">{giftCard.code}</p>
                </div>
              </div>

              {/* Balance */}
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-1">{t.balance}</p>
                <p
                  className={`text-4xl font-bold ${
                    giftCard.currentBalance > 0 ? "text-green-600" : "text-muted-foreground"
                  }`}
                >
                  {formatCurrency(giftCard.currentBalance, giftCard.currency)}
                </p>
              </div>

              {/* Expiration */}
              {giftCard.status === "ACTIVE" && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">{t.expiresAt}</p>
                  <p className="font-medium">
                    {giftCard.expiresAt ? formatDate(giftCard.expiresAt) : t.noExpiration}
                  </p>
                </div>
              )}

              {/* Message for non-active cards */}
              {giftCard.message && (
                <div className="pt-4 border-t">
                  <p className="text-muted-foreground text-sm">{giftCard.message}</p>
                </div>
              )}

              {/* Redemption hint for active cards */}
              {giftCard.status === "ACTIVE" && giftCard.currentBalance > 0 && (
                <div className="pt-4 border-t bg-muted/50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
                  <p className="text-sm text-muted-foreground">
                    <CreditCard className="inline-block h-4 w-4 mr-1" />
                    {t.redeemAtCheckout}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Empty State - no search yet */}
        {!giftCard && !error && !isLoading && (
          <Card className="p-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <CreditCard className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">{t.subtitle}</p>
          </Card>
        )}
      </div>
    </main>
  )
}
