// Currency Service for multi-currency support
// Handles exchange rate management, conversion, and auto-detection

import { prisma } from "@/lib/prisma"
import type { Currency } from "@prisma/client"

// Currency metadata
export const CURRENCY_INFO: Record<string, {
  code: string
  symbol: string
  name: string
  nameKh: string
  decimals: number
  symbolPosition: "before" | "after"
}> = {
  USD: { code: "USD", symbol: "$", name: "US Dollar", nameKh: "ដុល្លារអាមេរិក", decimals: 2, symbolPosition: "before" },
  KHR: { code: "KHR", symbol: "៛", name: "Cambodian Riel", nameKh: "រៀល", decimals: 0, symbolPosition: "after" },
  THB: { code: "THB", symbol: "฿", name: "Thai Baht", nameKh: "បាតថៃ", decimals: 2, symbolPosition: "before" },
  VND: { code: "VND", symbol: "₫", name: "Vietnamese Dong", nameKh: "ដុងវៀតណាម", decimals: 0, symbolPosition: "after" },
  SGD: { code: "SGD", symbol: "S$", name: "Singapore Dollar", nameKh: "ដុល្លារសិង្ហបុរី", decimals: 2, symbolPosition: "before" },
  MYR: { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", nameKh: "រីងហ្គីតម៉ាឡេស៊ី", decimals: 2, symbolPosition: "before" },
  EUR: { code: "EUR", symbol: "€", name: "Euro", nameKh: "អឺរ៉ូ", decimals: 2, symbolPosition: "before" },
  GBP: { code: "GBP", symbol: "£", name: "British Pound", nameKh: "ផោនអង់គ្លេស", decimals: 2, symbolPosition: "before" },
}

// Country to currency mapping for auto-detection
export const COUNTRY_CURRENCY_MAP: Record<string, Currency> = {
  US: "USD",
  KH: "KHR",
  TH: "THB",
  VN: "VND",
  SG: "SGD",
  MY: "MYR",
  // European countries
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", BE: "EUR", AT: "EUR", IE: "EUR", PT: "EUR", FI: "EUR", GR: "EUR",
  // UK
  GB: "GBP",
  // Default to USD for unknown countries
}

// Default exchange rates (1 USD = X target currency) - fallback when no DB rates
export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  KHR: 4000,
  THB: 35,
  VND: 24500,
  SGD: 1.35,
  MYR: 4.7,
  EUR: 0.92,
  GBP: 0.79,
}

// Get currency config for shop
export async function getCurrencyConfig(clientId?: string | null) {
  const config = await prisma.currencyConfig.findFirst({
    where: clientId ? { clientId } : { clientId: null },
  })

  // Return default config if none exists
  if (!config) {
    return {
      id: null,
      baseCurrency: "USD" as Currency,
      enabledCurrencies: ["USD", "KHR"] as Currency[],
      autoDetectEnabled: true,
      defaultCurrency: "USD" as Currency,
      conversionFeeEnabled: false,
      conversionFeePercent: 0,
      displayConversionFee: true,
      rateUpdateFrequency: "daily",
      rateApiProvider: null,
    }
  }

  return {
    ...config,
    enabledCurrencies: (config.enabledCurrencies as string[]) || ["USD", "KHR"],
    conversionFeePercent: Number(config.conversionFeePercent),
  }
}

// Get exchange rate from DB or use default
export async function getExchangeRate(
  fromCurrency: Currency,
  toCurrency: Currency
): Promise<{ rate: number; source: string; fetchedAt: Date }> {
  if (fromCurrency === toCurrency) {
    return { rate: 1, source: "identity", fetchedAt: new Date() }
  }

  // Try to get rate from DB
  const dbRate = await prisma.exchangeRate.findFirst({
    where: {
      baseCurrency: fromCurrency,
      targetCurrency: toCurrency,
      isActive: true,
    },
    orderBy: { fetchedAt: "desc" },
  })

  if (dbRate) {
    return {
      rate: Number(dbRate.rate),
      source: dbRate.source,
      fetchedAt: dbRate.fetchedAt,
    }
  }

  // Try inverse rate
  const inverseRate = await prisma.exchangeRate.findFirst({
    where: {
      baseCurrency: toCurrency,
      targetCurrency: fromCurrency,
      isActive: true,
    },
    orderBy: { fetchedAt: "desc" },
  })

  if (inverseRate) {
    return {
      rate: Number(inverseRate.inverseRate),
      source: inverseRate.source,
      fetchedAt: inverseRate.fetchedAt,
    }
  }

  // Use default rates (convert via USD)
  const fromToUsd = 1 / (DEFAULT_EXCHANGE_RATES[fromCurrency] || 1)
  const usdToTarget = DEFAULT_EXCHANGE_RATES[toCurrency] || 1
  const rate = fromToUsd * usdToTarget

  return {
    rate,
    source: "default",
    fetchedAt: new Date(),
  }
}

// Get all active exchange rates
export async function getAllExchangeRates(baseCurrency: Currency = "USD") {
  const rates = await prisma.exchangeRate.findMany({
    where: {
      baseCurrency,
      isActive: true,
    },
    orderBy: { targetCurrency: "asc" },
  })

  // Build rate map including defaults for missing currencies
  const rateMap: Record<string, { rate: number; source: string; fetchedAt: Date }> = {}

  // Add rates from DB
  for (const rate of rates) {
    rateMap[rate.targetCurrency] = {
      rate: Number(rate.rate),
      source: rate.source,
      fetchedAt: rate.fetchedAt,
    }
  }

  // Add default rates for missing currencies
  for (const [currency, defaultRate] of Object.entries(DEFAULT_EXCHANGE_RATES)) {
    if (currency !== baseCurrency && !rateMap[currency]) {
      // Convert default rate if base is not USD
      const baseToUsd = 1 / (DEFAULT_EXCHANGE_RATES[baseCurrency] || 1)
      rateMap[currency] = {
        rate: baseToUsd * defaultRate,
        source: "default",
        fetchedAt: new Date(),
      }
    }
  }

  return rateMap
}

// Convert amount between currencies
export interface ConversionResult {
  originalAmount: number
  convertedAmount: number
  exchangeRate: number
  conversionFee: number
  feePercentage: number
  totalWithFee: number
  fromCurrency: Currency
  toCurrency: Currency
  source: string
}

export async function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  options?: {
    applyFee?: boolean
    feePercentage?: number
    clientId?: string | null
  }
): Promise<ConversionResult> {
  const { rate, source } = await getExchangeRate(fromCurrency, toCurrency)
  const convertedAmount = amount * rate

  let conversionFee = 0
  let feePercentage = 0

  if (options?.applyFee !== false) {
    // Get fee from config or use provided
    if (options?.feePercentage !== undefined) {
      feePercentage = options.feePercentage
    } else {
      const config = await getCurrencyConfig(options?.clientId)
      if (config.conversionFeeEnabled) {
        feePercentage = config.conversionFeePercent
      }
    }

    conversionFee = convertedAmount * feePercentage
  }

  const currencyInfo = CURRENCY_INFO[toCurrency]
  const decimals = currencyInfo?.decimals ?? 2

  return {
    originalAmount: amount,
    convertedAmount: Number(convertedAmount.toFixed(decimals)),
    exchangeRate: rate,
    conversionFee: Number(conversionFee.toFixed(decimals)),
    feePercentage,
    totalWithFee: Number((convertedAmount + conversionFee).toFixed(decimals)),
    fromCurrency,
    toCurrency,
    source,
  }
}

// Format price in given currency
export function formatPrice(amount: number, currency: Currency | string): string {
  const info = CURRENCY_INFO[currency]
  if (!info) {
    return `${amount.toFixed(2)} ${currency}`
  }

  const formatted = info.decimals === 0
    ? Math.round(amount).toLocaleString()
    : amount.toFixed(info.decimals)

  return info.symbolPosition === "before"
    ? `${info.symbol}${formatted}`
    : `${formatted}${info.symbol}`
}

// Detect currency from country code
export function detectCurrencyFromCountry(countryCode: string): Currency {
  const upper = countryCode.toUpperCase()
  return (COUNTRY_CURRENCY_MAP[upper] || "USD") as Currency
}

// Detect currency from browser/request info
export interface DetectionResult {
  currency: Currency
  country: string | null
  source: "geolocation" | "timezone" | "header" | "default"
  confidence: "high" | "medium" | "low"
}

export function detectCurrencyFromTimezone(timezone: string): DetectionResult {
  // Map common timezones to countries
  const timezoneCountryMap: Record<string, string> = {
    "Asia/Phnom_Penh": "KH",
    "Asia/Bangkok": "TH",
    "Asia/Ho_Chi_Minh": "VN",
    "Asia/Saigon": "VN",
    "Asia/Singapore": "SG",
    "Asia/Kuala_Lumpur": "MY",
    "Europe/London": "GB",
    "Europe/Paris": "FR",
    "Europe/Berlin": "DE",
    "America/New_York": "US",
    "America/Los_Angeles": "US",
    "America/Chicago": "US",
  }

  const country = timezoneCountryMap[timezone]
  if (country) {
    return {
      currency: detectCurrencyFromCountry(country),
      country,
      source: "timezone",
      confidence: "medium",
    }
  }

  return {
    currency: "USD",
    country: null,
    source: "default",
    confidence: "low",
  }
}

// Update exchange rates from external API
export async function updateExchangeRates(
  provider: "openexchangerates" | "fixer" | "manual",
  apiKey?: string,
  rates?: Record<string, number>
): Promise<{ success: boolean; updated: number; errors: string[] }> {
  const errors: string[] = []
  let updated = 0

  if (provider === "manual" && rates) {
    // Manual rate update
    for (const [currency, rate] of Object.entries(rates)) {
      try {
        await prisma.exchangeRate.upsert({
          where: {
            baseCurrency_targetCurrency: {
              baseCurrency: "USD",
              targetCurrency: currency as Currency,
            },
          },
          update: {
            rate,
            inverseRate: 1 / rate,
            source: "manual",
            fetchedAt: new Date(),
          },
          create: {
            baseCurrency: "USD",
            targetCurrency: currency as Currency,
            rate,
            inverseRate: 1 / rate,
            source: "manual",
            fetchedAt: new Date(),
          },
        })
        updated++
      } catch (error) {
        errors.push(`Failed to update ${currency}: ${error}`)
      }
    }
  } else if (provider === "openexchangerates" && apiKey) {
    // Fetch from OpenExchangeRates API
    try {
      const response = await fetch(
        `https://openexchangerates.org/api/latest.json?app_id=${apiKey}`
      )
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }
      const data = await response.json()

      // Update each rate
      for (const [currency, rate] of Object.entries(data.rates as Record<string, number>)) {
        if (CURRENCY_INFO[currency]) {
          try {
            await prisma.exchangeRate.upsert({
              where: {
                baseCurrency_targetCurrency: {
                  baseCurrency: "USD",
                  targetCurrency: currency as Currency,
                },
              },
              update: {
                rate,
                inverseRate: 1 / rate,
                source: "openexchangerates",
                fetchedAt: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
              },
              create: {
                baseCurrency: "USD",
                targetCurrency: currency as Currency,
                rate,
                inverseRate: 1 / rate,
                source: "openexchangerates",
                fetchedAt: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              },
            })
            updated++
          } catch {
            errors.push(`Failed to save ${currency}`)
          }
        }
      }
    } catch (error) {
      errors.push(`API fetch failed: ${error}`)
    }
  }

  return { success: errors.length === 0, updated, errors }
}

// Log a currency conversion for an order
export async function logCurrencyConversion(
  orderId: string | null,
  conversion: ConversionResult,
  customerCountry?: string,
  settlementCurrency: Currency = "USD"
) {
  // Convert to settlement currency if different
  let settlementAmount = conversion.originalAmount
  if (conversion.fromCurrency !== settlementCurrency) {
    const settlement = await convertCurrency(
      conversion.originalAmount,
      conversion.fromCurrency,
      settlementCurrency,
      { applyFee: false }
    )
    settlementAmount = settlement.convertedAmount
  }

  return prisma.currencyConversionLog.create({
    data: {
      orderId,
      fromCurrency: conversion.fromCurrency,
      toCurrency: conversion.toCurrency,
      originalAmount: conversion.originalAmount,
      convertedAmount: conversion.convertedAmount,
      exchangeRate: conversion.exchangeRate,
      conversionFee: conversion.conversionFee,
      feePercentage: conversion.feePercentage,
      settlementCurrency,
      settlementAmount,
      customerCountry,
      detectedCurrency: conversion.toCurrency,
    },
  })
}
