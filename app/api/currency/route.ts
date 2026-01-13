// Multi-currency API endpoint
// Handles exchange rates, currency detection, conversion, and configuration

import { NextRequest, NextResponse } from "next/server"
import {
  getCurrencyConfig,
  getAllExchangeRates,
  getExchangeRate,
  convertCurrency,
  updateExchangeRates,
  detectCurrencyFromCountry,
  detectCurrencyFromTimezone,
  CURRENCY_INFO,
  DEFAULT_EXCHANGE_RATES,
  type ConversionResult,
} from "@/lib/currency-service"
import { prisma } from "@/lib/prisma"
import type { Currency } from "@prisma/client"

// GET: Get exchange rates, detect currency, or get config
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get("action") || "rates"

  try {
    // Get currency configuration
    if (action === "config") {
      const clientId = searchParams.get("clientId")
      const config = await getCurrencyConfig(clientId)

      return NextResponse.json({
        config,
        currencies: Object.entries(CURRENCY_INFO).map(([code, info]) => ({
          code,
          ...info,
          enabled: config.enabledCurrencies.includes(code),
        })),
      })
    }

    // Get all exchange rates
    if (action === "rates") {
      const baseCurrency = (searchParams.get("base") as Currency) || "USD"
      const rates = await getAllExchangeRates(baseCurrency)

      return NextResponse.json({
        base: baseCurrency,
        rates,
        currencies: Object.entries(CURRENCY_INFO).map(([code, info]) => ({
          code,
          ...info,
          rate: rates[code]?.rate || DEFAULT_EXCHANGE_RATES[code] || 1,
          source: rates[code]?.source || "default",
        })),
        updatedAt: new Date().toISOString(),
      })
    }

    // Detect currency from request headers and info
    if (action === "detect") {
      const timezone = searchParams.get("timezone")
      const country = searchParams.get("country")

      // Priority: explicit country > IP geolocation header > timezone
      let result: {
        currency: Currency
        country: string | null
        source: string
        confidence: string
      }

      if (country) {
        result = {
          currency: detectCurrencyFromCountry(country),
          country: country.toUpperCase(),
          source: "explicit",
          confidence: "high",
        }
      } else {
        // Check for Cloudflare/Vercel country header
        const cfCountry = req.headers.get("cf-ipcountry")
        const vercelCountry = req.headers.get("x-vercel-ip-country")
        const geoCountry = cfCountry || vercelCountry

        if (geoCountry) {
          result = {
            currency: detectCurrencyFromCountry(geoCountry),
            country: geoCountry.toUpperCase(),
            source: "geolocation",
            confidence: "high",
          }
        } else if (timezone) {
          const detected = detectCurrencyFromTimezone(timezone)
          result = detected
        } else {
          result = {
            currency: "USD",
            country: null,
            source: "default",
            confidence: "low",
          }
        }
      }

      const config = await getCurrencyConfig()

      // If detected currency not enabled, fall back to default
      if (!config.enabledCurrencies.includes(result.currency)) {
        result = {
          ...result,
          currency: config.defaultCurrency,
          source: "fallback",
          confidence: "low",
        }
      }

      return NextResponse.json({
        detected: result,
        enabled: config.enabledCurrencies,
        autoDetectEnabled: config.autoDetectEnabled,
      })
    }

    // Convert amount between currencies
    if (action === "convert") {
      const amount = parseFloat(searchParams.get("amount") || "0")
      const from = (searchParams.get("from") as Currency) || "USD"
      const to = (searchParams.get("to") as Currency) || "KHR"

      if (isNaN(amount) || amount < 0) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
      }

      const result = await convertCurrency(amount, from, to)

      return NextResponse.json(result)
    }

    // Get specific rate
    if (action === "rate") {
      const from = (searchParams.get("from") as Currency) || "USD"
      const to = (searchParams.get("to") as Currency) || "KHR"

      const { rate, source, fetchedAt } = await getExchangeRate(from, to)

      return NextResponse.json({
        from,
        to,
        rate,
        source,
        fetchedAt,
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Currency API error:", error)
    return NextResponse.json(
      { error: "Failed to process currency request" },
      { status: 500 }
    )
  }
}

// POST: Update rates, save config, or log conversion
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    // Update exchange rates manually or from API
    if (action === "update_rates") {
      const { provider, apiKey, rates } = body

      if (provider === "manual" && !rates) {
        return NextResponse.json({ error: "Rates required for manual update" }, { status: 400 })
      }

      const result = await updateExchangeRates(provider, apiKey, rates)

      return NextResponse.json(result)
    }

    // Save currency configuration
    if (action === "save_config") {
      const { clientId, config } = body

      const savedConfig = await prisma.currencyConfig.upsert({
        where: clientId ? { clientId } : { id: "default" },
        update: {
          baseCurrency: config.baseCurrency,
          enabledCurrencies: config.enabledCurrencies,
          autoDetectEnabled: config.autoDetectEnabled,
          defaultCurrency: config.defaultCurrency,
          conversionFeeEnabled: config.conversionFeeEnabled,
          conversionFeePercent: config.conversionFeePercent,
          displayConversionFee: config.displayConversionFee,
          rateUpdateFrequency: config.rateUpdateFrequency,
          rateApiProvider: config.rateApiProvider,
          rateApiKey: config.rateApiKey,
        },
        create: {
          clientId,
          baseCurrency: config.baseCurrency || "USD",
          enabledCurrencies: config.enabledCurrencies || ["USD", "KHR"],
          autoDetectEnabled: config.autoDetectEnabled ?? true,
          defaultCurrency: config.defaultCurrency || "USD",
          conversionFeeEnabled: config.conversionFeeEnabled ?? false,
          conversionFeePercent: config.conversionFeePercent || 0,
          displayConversionFee: config.displayConversionFee ?? true,
          rateUpdateFrequency: config.rateUpdateFrequency || "daily",
          rateApiProvider: config.rateApiProvider,
          rateApiKey: config.rateApiKey,
        },
      })

      return NextResponse.json({ success: true, config: savedConfig })
    }

    // Batch convert multiple amounts
    if (action === "batch_convert") {
      const { amounts, from, to } = body as {
        amounts: number[]
        from: Currency
        to: Currency
      }

      const results: ConversionResult[] = []
      for (const amount of amounts) {
        const result = await convertCurrency(amount, from, to)
        results.push(result)
      }

      return NextResponse.json({ results })
    }

    // Set single exchange rate
    if (action === "set_rate") {
      const { baseCurrency, targetCurrency, rate } = body

      if (!baseCurrency || !targetCurrency || !rate) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      }

      const savedRate = await prisma.exchangeRate.upsert({
        where: {
          baseCurrency_targetCurrency: {
            baseCurrency,
            targetCurrency,
          },
        },
        update: {
          rate,
          inverseRate: 1 / rate,
          source: "manual",
          fetchedAt: new Date(),
        },
        create: {
          baseCurrency,
          targetCurrency,
          rate,
          inverseRate: 1 / rate,
          source: "manual",
          fetchedAt: new Date(),
        },
      })

      return NextResponse.json({ success: true, rate: savedRate })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Currency API error:", error)
    return NextResponse.json(
      { error: "Failed to process currency request" },
      { status: 500 }
    )
  }
}
