"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RefreshCw, Check, Percent } from "lucide-react"
import { translations } from "@/lib/i18n"

type SubscriptionFrequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "BIMONTHLY" | "QUARTERLY"

interface SubscribeSaveProps {
  productId: string
  variantId?: string | null
  priceUsd: number
  priceKhr: number
  language?: "EN" | "KH"
  currency?: "USD" | "KHR"
  discountPercent?: number
  onSubscribe?: (data: {
    productId: string
    variantId?: string | null
    frequency: SubscriptionFrequency
    quantity: number
  }) => void
  disabled?: boolean
}

export function SubscribeSave({
  productId,
  variantId,
  priceUsd,
  priceKhr,
  language = "EN",
  currency = "USD",
  discountPercent = 10,
  onSubscribe,
  disabled = false,
}: SubscribeSaveProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [frequency, setFrequency] = useState<SubscriptionFrequency>("MONTHLY")
  const [isSubscribing, setIsSubscribing] = useState(false)

  const t = translations[language === "EN" ? "en" : "kh"].productSubscription

  const finalPriceUsd = priceUsd * (1 - discountPercent / 100)
  const finalPriceKhr = Math.round(priceKhr * (1 - discountPercent / 100))
  const savingsUsd = priceUsd - finalPriceUsd
  const savingsKhr = priceKhr - finalPriceKhr

  const formatPrice = (usd: number, khr: number) => {
    if (currency === "USD") {
      return `$${usd.toFixed(2)}`
    }
    return `${khr.toLocaleString()}៛`
  }

  const frequencyOptions: { value: SubscriptionFrequency; label: string }[] = [
    { value: "WEEKLY", label: t.weekly },
    { value: "BIWEEKLY", label: t.biweekly },
    { value: "MONTHLY", label: t.monthly },
    { value: "BIMONTHLY", label: t.bimonthly },
    { value: "QUARTERLY", label: t.quarterly },
  ]

  const handleSubscribe = async () => {
    if (onSubscribe) {
      setIsSubscribing(true)
      try {
        await onSubscribe({
          productId,
          variantId,
          frequency,
          quantity: 1,
        })
      } finally {
        setIsSubscribing(false)
      }
    }
  }

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        disabled={disabled}
        className="w-full flex items-center justify-between p-3 border border-dashed border-primary/50 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">{t.title}</span>
        </div>
        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
          <Percent className="h-3 w-3 mr-1" />
          {t.savePercent.replace("{percent}", String(discountPercent))}
        </Badge>
      </button>
    )
  }

  return (
    <Card className="p-4 border-primary/50 bg-primary/5">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            <span className="font-semibold">{t.title}</span>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Pricing */}
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold text-primary">
            {formatPrice(finalPriceUsd, finalPriceKhr)}
          </span>
          <span className="text-sm text-muted-foreground line-through">
            {formatPrice(priceUsd, priceKhr)}
          </span>
          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            {t.youSave} {formatPrice(savingsUsd, savingsKhr)}
          </Badge>
        </div>

        {/* Frequency Select */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t.frequency}</label>
          <Select value={frequency} onValueChange={(v) => setFrequency(v as SubscriptionFrequency)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {frequencyOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Benefits */}
        <ul className="text-sm text-muted-foreground space-y-1">
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            {language === "EN" ? "Free delivery on subscriptions" : "ដឹកជញ្ជូនឥតគិតថ្លៃសម្រាប់ការជាវ"}
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            {language === "EN" ? "Cancel or pause anytime" : "បោះបង់ ឬផ្អាកនៅពេលណាក៏បាន"}
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            {language === "EN" ? "Skip deliveries when you want" : "រំលងការដឹកជញ្ជូនពេលអ្នកចង់"}
          </li>
        </ul>

        {/* Subscribe Button */}
        <Button
          onClick={handleSubscribe}
          disabled={disabled || isSubscribing}
          className="w-full"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isSubscribing ? "animate-spin" : ""}`} />
          {isSubscribing
            ? (language === "EN" ? "Subscribing..." : "កំពុងជាវ...")
            : t.subscribeButton}
        </Button>
      </div>
    </Card>
  )
}
