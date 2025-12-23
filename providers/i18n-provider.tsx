"use client"

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react"
import en from "@/lib/i18n/en.json"
import kh from "@/lib/i18n/kh.json"

export type Language = "en" | "kh"
export type Currency = "USD" | "KHR"

interface I18nContextType {
  language: Language
  currency: Currency
  setLanguage: (lang: Language) => void
  setCurrency: (curr: Currency) => void
  t: (key: string) => string
  formatPrice: (usd: number, khr?: number) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

const LANGUAGE_STORAGE_KEY = "apoloshop-language"
const CURRENCY_STORAGE_KEY = "apoloshop-currency"
const EXCHANGE_RATE = parseInt(process.env.NEXT_PUBLIC_EXCHANGE_RATE || "4100")

const translations = { en, kh }

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en")
  const [currency, setCurrencyState] = useState<Currency>("USD")

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language
    const savedCurrency = localStorage.getItem(CURRENCY_STORAGE_KEY) as Currency

    if (savedLanguage && (savedLanguage === "en" || savedLanguage === "kh")) {
      setLanguageState(savedLanguage)
    }
    if (savedCurrency && (savedCurrency === "USD" || savedCurrency === "KHR")) {
      setCurrencyState(savedCurrency)
    }
  }, [])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
  }, [])

  const setCurrency = useCallback((curr: Currency) => {
    setCurrencyState(curr)
    localStorage.setItem(CURRENCY_STORAGE_KEY, curr)
  }, [])

  const t = useCallback(
    (key: string): string => {
      const keys = key.split(".")
      let value: unknown = translations[language]

      for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
          value = (value as Record<string, unknown>)[k]
        } else {
          return key // Return key if translation not found
        }
      }

      return typeof value === "string" ? value : key
    },
    [language]
  )

  const formatPrice = useCallback(
    (usd: number, khr?: number): string => {
      if (currency === "USD") {
        return `$${usd.toFixed(2)}`
      }
      const khrAmount = khr ?? Math.round(usd * EXCHANGE_RATE)
      return `${khrAmount.toLocaleString()} ៛`
    },
    [currency]
  )

  return (
    <I18nContext.Provider
      value={{
        language,
        currency,
        setLanguage,
        setCurrency,
        t,
        formatPrice,
      }}
    >
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error("useI18n must be used within an I18nProvider")
  }
  return context
}
