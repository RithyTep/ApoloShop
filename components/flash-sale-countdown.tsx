"use client"

import { useState, useEffect, useCallback } from "react"
import { Clock, Zap } from "lucide-react"

interface FlashSaleCountdownProps {
  endTime: Date | string
  language?: "EN" | "KH"
  onExpire?: () => void
  variant?: "default" | "compact" | "banner"
  showIcon?: boolean
  className?: string
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
  total: number
}

const translations = {
  en: {
    endsIn: "Ends in",
    days: "d",
    hours: "h",
    minutes: "m",
    seconds: "s",
    saleEnded: "Sale Ended",
    flashSale: "Flash Sale",
  },
  kh: {
    endsIn: "នៅសល់",
    days: "ថ្ងៃ",
    hours: "ម៉ោង",
    minutes: "នាទី",
    seconds: "វិនាទី",
    saleEnded: "ការលក់បានបញ្ចប់",
    flashSale: "ការលក់ភ្លាម",
  },
}

function calculateTimeLeft(endTime: Date): TimeLeft {
  const difference = endTime.getTime() - new Date().getTime()

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    total: difference,
  }
}

export function FlashSaleCountdown({
  endTime,
  language = "EN",
  onExpire,
  variant = "default",
  showIcon = true,
  className = "",
}: FlashSaleCountdownProps) {
  const endDate = typeof endTime === "string" ? new Date(endTime) : endTime
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calculateTimeLeft(endDate)
  )
  const [hasExpired, setHasExpired] = useState(false)

  const t = translations[language === "EN" ? "en" : "kh"]

  const handleExpire = useCallback(() => {
    if (!hasExpired) {
      setHasExpired(true)
      onExpire?.()
    }
  }, [hasExpired, onExpire])

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(endDate)
      setTimeLeft(newTimeLeft)

      if (newTimeLeft.total <= 0) {
        clearInterval(timer)
        handleExpire()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [endDate, handleExpire])

  if (hasExpired || timeLeft.total <= 0) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 text-muted-foreground ${className}`}
      >
        {showIcon && <Clock className="h-4 w-4" />}
        <span className="text-sm">{t.saleEnded}</span>
      </div>
    )
  }

  // Compact variant - just numbers
  if (variant === "compact") {
    return (
      <div className={`inline-flex items-center gap-1 ${className}`}>
        {showIcon && <Zap className="h-3.5 w-3.5 text-orange-500" />}
        <span className="text-sm font-medium tabular-nums text-orange-600">
          {timeLeft.days > 0 && `${timeLeft.days}${t.days} `}
          {String(timeLeft.hours).padStart(2, "0")}:
          {String(timeLeft.minutes).padStart(2, "0")}:
          {String(timeLeft.seconds).padStart(2, "0")}
        </span>
      </div>
    )
  }

  // Banner variant - larger with labels
  if (variant === "banner") {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        <div className="flex items-center gap-2 text-white/90">
          {showIcon && <Zap className="h-5 w-5" />}
          <span className="text-sm font-medium uppercase tracking-wide">
            {t.flashSale} • {t.endsIn}
          </span>
        </div>
        <div className="flex gap-3">
          {timeLeft.days > 0 && (
            <TimeUnit value={timeLeft.days} label={t.days} />
          )}
          <TimeUnit value={timeLeft.hours} label={t.hours} />
          <TimeUnit value={timeLeft.minutes} label={t.minutes} />
          <TimeUnit value={timeLeft.seconds} label={t.seconds} />
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-md bg-orange-50 px-3 py-1.5 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 ${className}`}
    >
      {showIcon && <Zap className="h-4 w-4" />}
      <span className="text-sm font-medium">{t.endsIn}:</span>
      <span className="font-semibold tabular-nums">
        {timeLeft.days > 0 && (
          <span>
            {timeLeft.days}
            <span className="text-xs">{t.days}</span>{" "}
          </span>
        )}
        {String(timeLeft.hours).padStart(2, "0")}
        <span className="text-xs">{t.hours}</span>{" "}
        {String(timeLeft.minutes).padStart(2, "0")}
        <span className="text-xs">{t.minutes}</span>{" "}
        {String(timeLeft.seconds).padStart(2, "0")}
        <span className="text-xs">{t.seconds}</span>
      </span>
    </div>
  )
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center rounded bg-white/20 px-3 py-2 backdrop-blur-sm">
      <span className="text-2xl font-bold tabular-nums text-white">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-xs uppercase tracking-wide text-white/80">
        {label}
      </span>
    </div>
  )
}

// Flash sale badge for product cards
interface FlashSaleBadgeProps {
  discountPercentage: number
  language?: "EN" | "KH"
  className?: string
}

export function FlashSaleBadge({
  discountPercentage,
  language = "EN",
  className = "",
}: FlashSaleBadgeProps) {
  const t = translations[language === "EN" ? "en" : "kh"]

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-2 py-0.5 text-white shadow-sm ${className}`}
    >
      <Zap className="h-3 w-3" />
      <span className="text-xs font-bold">-{discountPercentage}%</span>
    </div>
  )
}

// Price display with flash sale
interface FlashSalePriceProps {
  originalPriceUsd: number
  originalPriceKhr: number
  salePriceUsd: number
  salePriceKhr: number
  currency: "USD" | "KHR"
  language?: "EN" | "KH"
  size?: "sm" | "md" | "lg"
  className?: string
}

export function FlashSalePrice({
  originalPriceUsd,
  originalPriceKhr,
  salePriceUsd,
  salePriceKhr,
  currency,
  size = "md",
  className = "",
}: FlashSalePriceProps) {
  const originalPrice =
    currency === "USD"
      ? `$${originalPriceUsd.toFixed(2)}`
      : `${originalPriceKhr.toLocaleString()} ៛`
  const salePrice =
    currency === "USD"
      ? `$${salePriceUsd.toFixed(2)}`
      : `${salePriceKhr.toLocaleString()} ៛`

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span
        className={`font-bold text-red-600 ${sizeClasses[size]}`}
      >
        {salePrice}
      </span>
      <span
        className={`text-muted-foreground line-through ${
          size === "lg" ? "text-base" : "text-sm"
        }`}
      >
        {originalPrice}
      </span>
    </div>
  )
}
