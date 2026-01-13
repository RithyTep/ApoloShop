"use client"

import { useState, useEffect, useCallback } from "react"
import { CalendarClock, Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface PreOrderCountdownProps {
  releaseDate: Date | string
  language?: "EN" | "KH"
  onReleased?: () => void
  variant?: "default" | "compact" | "badge"
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
    preOrder: "Pre-Order",
    releasesIn: "Releases in",
    days: "d",
    hours: "h",
    minutes: "m",
    seconds: "s",
    released: "Now Available!",
    availableOn: "Available on",
  },
  kh: {
    preOrder: "បញ្ជាទិញមុន",
    releasesIn: "ចេញផ្សាយក្នុង",
    days: "ថ្ងៃ",
    hours: "ម៉ោង",
    minutes: "នាទី",
    seconds: "វិនាទី",
    released: "មានលក់ហើយ!",
    availableOn: "មានចាប់ផ្តើមពី",
  },
}

function calculateTimeLeft(releaseDate: Date): TimeLeft {
  const difference = releaseDate.getTime() - new Date().getTime()

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

export function PreOrderCountdown({
  releaseDate,
  language = "EN",
  onReleased,
  variant = "default",
  showIcon = true,
  className = "",
}: PreOrderCountdownProps) {
  const releaseDateObj = typeof releaseDate === "string" ? new Date(releaseDate) : releaseDate
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calculateTimeLeft(releaseDateObj)
  )
  const [hasReleased, setHasReleased] = useState(false)

  const t = translations[language === "EN" ? "en" : "kh"]

  const handleReleased = useCallback(() => {
    if (!hasReleased) {
      setHasReleased(true)
      onReleased?.()
    }
  }, [hasReleased, onReleased])

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(releaseDateObj)
      setTimeLeft(newTimeLeft)

      if (newTimeLeft.total <= 0) {
        clearInterval(timer)
        handleReleased()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [releaseDateObj, handleReleased])

  if (hasReleased || timeLeft.total <= 0) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 text-green-600 dark:text-green-400 ${className}`}
      >
        {showIcon && <Package className="h-4 w-4" />}
        <span className="text-sm font-medium">{t.released}</span>
      </div>
    )
  }

  // Badge variant - just a small badge
  if (variant === "badge") {
    return (
      <Badge
        variant="secondary"
        className={`bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 ${className}`}
      >
        {showIcon && <CalendarClock className="mr-1 h-3 w-3" />}
        {t.preOrder}
      </Badge>
    )
  }

  // Compact variant - just numbers
  if (variant === "compact") {
    return (
      <div className={`inline-flex items-center gap-1 ${className}`}>
        {showIcon && <CalendarClock className="h-3.5 w-3.5 text-blue-500" />}
        <span className="text-sm font-medium tabular-nums text-blue-600 dark:text-blue-400">
          {timeLeft.days > 0 && `${timeLeft.days}${t.days} `}
          {String(timeLeft.hours).padStart(2, "0")}:
          {String(timeLeft.minutes).padStart(2, "0")}:
          {String(timeLeft.seconds).padStart(2, "0")}
        </span>
      </div>
    )
  }

  // Default variant
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-md bg-blue-50 px-3 py-1.5 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 ${className}`}
    >
      {showIcon && <CalendarClock className="h-4 w-4" />}
      <span className="text-sm font-medium">{t.releasesIn}:</span>
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

// Pre-order badge for product cards
interface PreOrderBadgeProps {
  language?: "EN" | "KH"
  depositPercent?: number
  className?: string
}

export function PreOrderBadge({
  language = "EN",
  depositPercent,
  className = "",
}: PreOrderBadgeProps) {
  const t = translations[language === "EN" ? "en" : "kh"]

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-2 py-0.5 text-white shadow-sm ${className}`}
    >
      <CalendarClock className="h-3 w-3" />
      <span className="text-xs font-bold">
        {t.preOrder}
        {depositPercent && depositPercent < 100 && ` ${depositPercent}%`}
      </span>
    </div>
  )
}

// Pre-order info display for product detail page
interface PreOrderInfoProps {
  releaseDate: Date | string
  depositPercent?: number
  maxQuantity?: number
  language?: "EN" | "KH"
  currency?: "USD" | "KHR"
  price?: { usd: number; khr: number }
  className?: string
}

export function PreOrderInfo({
  releaseDate,
  depositPercent,
  maxQuantity,
  language = "EN",
  currency = "USD",
  price,
  className = "",
}: PreOrderInfoProps) {
  const releaseDateObj = typeof releaseDate === "string" ? new Date(releaseDate) : releaseDate
  const t = translations[language === "EN" ? "en" : "kh"]

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(language === "EN" ? "en-US" : "km-KH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const depositAmount = price && depositPercent
    ? currency === "USD"
      ? `$${((price.usd * depositPercent) / 100).toFixed(2)}`
      : `${Math.round((price.khr * depositPercent) / 100).toLocaleString()}៛`
    : null

  return (
    <div
      className={`rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/50 ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <span className="font-semibold text-blue-700 dark:text-blue-300">
          {t.preOrder}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        {/* Release date */}
        <div className="flex items-center justify-between">
          <span className="text-blue-600 dark:text-blue-400">
            {t.availableOn}:
          </span>
          <span className="font-medium text-blue-700 dark:text-blue-300">
            {formatDate(releaseDateObj)}
          </span>
        </div>

        {/* Countdown */}
        <PreOrderCountdown
          releaseDate={releaseDateObj}
          language={language}
          variant="compact"
          showIcon={false}
          className="justify-center w-full py-2"
        />

        {/* Deposit info */}
        {depositPercent && depositPercent < 100 && (
          <div className="flex items-center justify-between pt-2 border-t border-blue-200 dark:border-blue-800">
            <span className="text-blue-600 dark:text-blue-400">
              {language === "EN" ? "Deposit required:" : "ប្រាក់កក់:"}
            </span>
            <span className="font-medium text-blue-700 dark:text-blue-300">
              {depositPercent}%{depositAmount && ` (${depositAmount})`}
            </span>
          </div>
        )}

        {/* Max quantity */}
        {maxQuantity && (
          <div className="flex items-center justify-between">
            <span className="text-blue-600 dark:text-blue-400">
              {language === "EN" ? "Max per order:" : "អតិបរមាក្នុងមួយការបញ្ជាទិញ:"}
            </span>
            <span className="font-medium text-blue-700 dark:text-blue-300">
              {maxQuantity}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
