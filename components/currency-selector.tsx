"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown, Loader2, Globe } from "lucide-react"
import { type Language, getTranslation } from "@/lib/i18n"
import { CURRENCY_INFO, type ConversionResult } from "@/lib/currency-service"
import type { Currency } from "@prisma/client"

interface CurrencySelectorProps {
  currency: Currency
  onCurrencyChange: (currency: Currency) => void
  language: Language
  enabledCurrencies?: Currency[]
  showDetectedBadge?: boolean
  detectedCurrency?: Currency | null
  variant?: "full" | "compact" | "pill"
  showConversionInfo?: boolean
  baseCurrency?: Currency
}

export function CurrencySelector({
  currency,
  onCurrencyChange,
  language,
  enabledCurrencies = ["USD", "KHR"],
  showDetectedBadge = false,
  detectedCurrency = null,
  variant = "compact",
  showConversionInfo = false,
  baseCurrency = "USD",
}: CurrencySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [rates, setRates] = useState<Record<string, { rate: number; source: string }>>({})
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const t = getTranslation(language)

  // Fetch exchange rates
  useEffect(() => {
    if (showConversionInfo) {
      setIsLoading(true)
      fetch(`/api/currency?action=rates&base=${baseCurrency}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.rates) {
            setRates(data.rates)
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false))
    }
  }, [showConversionInfo, baseCurrency])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const currentInfo = CURRENCY_INFO[currency] || { symbol: currency, name: currency, nameKh: currency }
  const displayName = language === "kh" ? currentInfo.nameKh : currentInfo.name

  // Pill variant - simple toggle like current implementation
  if (variant === "pill") {
    return (
      <div
        className="flex items-center bg-muted rounded-full p-0.5"
        role="group"
        aria-label={t.currency?.selection || "Currency selection"}
      >
        {enabledCurrencies.map((curr) => {
          const info = CURRENCY_INFO[curr]
          return (
            <button
              key={curr}
              onClick={() => onCurrencyChange(curr)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${
                currency === curr
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={currency === curr}
              aria-label={info?.name || curr}
            >
              {info?.symbol || curr}
            </button>
          )
        })}
      </div>
    )
  }

  // Compact variant - dropdown with symbols
  if (variant === "compact") {
    return (
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm bg-muted rounded-full hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={`${t.currency?.selection || "Currency"}: ${displayName}`}
        >
          <span className="font-medium">{currentInfo.symbol}</span>
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div
            className="absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg py-1 min-w-[140px] z-50"
            role="listbox"
            aria-label={t.currency?.selection || "Select currency"}
          >
            {enabledCurrencies.map((curr) => {
              const info = CURRENCY_INFO[curr]
              const isSelected = currency === curr
              const isDetected = detectedCurrency === curr

              return (
                <button
                  key={curr}
                  onClick={() => {
                    onCurrencyChange(curr)
                    setIsOpen(false)
                  }}
                  role="option"
                  aria-selected={isSelected}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors ${
                    isSelected ? "bg-muted font-medium" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-center">{info?.symbol}</span>
                    <span>{curr}</span>
                  </div>
                  {showDetectedBadge && isDetected && !isSelected && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
                      {t.currency?.detected || "Auto"}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Full variant - dropdown with names and conversion rates
  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-muted rounded-lg hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Globe className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{currentInfo.symbol}</span>
        <span className="text-muted-foreground">{currency}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg py-1 min-w-[220px] z-50"
          role="listbox"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            enabledCurrencies.map((curr) => {
              const info = CURRENCY_INFO[curr]
              const isSelected = currency === curr
              const isDetected = detectedCurrency === curr
              const rate = rates[curr]?.rate

              return (
                <button
                  key={curr}
                  onClick={() => {
                    onCurrencyChange(curr)
                    setIsOpen(false)
                  }}
                  role="option"
                  aria-selected={isSelected}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted transition-colors ${
                    isSelected ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-base">{info?.symbol}</span>
                    <div className="text-left">
                      <div className={isSelected ? "font-medium" : ""}>{curr}</div>
                      <div className="text-xs text-muted-foreground">
                        {language === "kh" ? info?.nameKh : info?.name}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {showConversionInfo && rate && curr !== baseCurrency && (
                      <div className="text-xs text-muted-foreground">
                        1 {baseCurrency} = {rate.toFixed(curr === "VND" || curr === "KHR" ? 0 : 2)} {curr}
                      </div>
                    )}
                    {showDetectedBadge && isDetected && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
                        {t.currency?.detected || "Detected"}
                      </span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// Hook for auto-detecting currency
export function useCurrencyDetection(
  onCurrencyDetected?: (currency: Currency, country: string | null) => void
) {
  const [isDetecting, setIsDetecting] = useState(true)
  const [detected, setDetected] = useState<{
    currency: Currency
    country: string | null
    source: string
    confidence: string
  } | null>(null)

  useEffect(() => {
    const detect = async () => {
      try {
        // Get timezone for detection
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

        const response = await fetch(`/api/currency?action=detect&timezone=${encodeURIComponent(timezone)}`)
        const data = await response.json()

        if (data.detected) {
          setDetected(data.detected)
          if (onCurrencyDetected && data.autoDetectEnabled) {
            onCurrencyDetected(data.detected.currency, data.detected.country)
          }
        }
      } catch (error) {
        console.error("Currency detection failed:", error)
      } finally {
        setIsDetecting(false)
      }
    }

    detect()
  }, []) // Run once on mount

  return { isDetecting, detected }
}

// Format price with proper currency formatting
export function useCurrencyFormatter(currency: Currency) {
  const formatPrice = (amount: number) => {
    const info = CURRENCY_INFO[currency]
    if (!info) return `${amount.toFixed(2)} ${currency}`

    const formatted = info.decimals === 0
      ? Math.round(amount).toLocaleString()
      : amount.toLocaleString(undefined, { minimumFractionDigits: info.decimals, maximumFractionDigits: info.decimals })

    return info.symbolPosition === "before"
      ? `${info.symbol}${formatted}`
      : `${formatted}${info.symbol}`
  }

  return { formatPrice }
}
