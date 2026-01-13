"use client"

import { useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { CartDrawer } from "@/components/cart-drawer"
import { CheckoutPage } from "@/components/checkout-page"
import { CompareFloatingBar } from "@/components/compare-button"
import {
  CartContext,
  LanguageContext,
  CurrencyContext,
  type CartItem,
} from "@/lib/shop-context"
import { ComparisonProvider } from "@/lib/comparison-context"
import type { ShopTheme, Product } from "@/lib/api-hooks"
import { type Language, detectBrowserLanguage } from "@/lib/i18n"

interface ShopClientWrapperProps {
  theme: ShopTheme
  products: Product[]
  children: ReactNode
}

type Page = "shop" | "checkout"

const LANGUAGE_STORAGE_KEY = "apolo_language"

export function ShopClientWrapper({ theme, products, children }: ShopClientWrapperProps) {
  const router = useRouter()
  const [cart, setCart] = useState<CartItem[]>([])
  const [language, setLanguage] = useState<Language>("en")
  const [currency, setCurrency] = useState<"USD" | "KHR">("USD")

  // Auto-detect browser language on initial load
  useEffect(() => {
    const storedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null
    if (storedLang && ["en", "kh", "th", "vi", "zh"].includes(storedLang)) {
      setLanguage(storedLang)
    } else {
      const detectedLang = detectBrowserLanguage()
      setLanguage(detectedLang)
    }
  }, [])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState<Page>("shop")

  // Cart functions
  const addToCart = (id: string, name: string, price: number, image: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === id)
      if (existing) {
        return prev.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { id, name, price, quantity: 1, image, inStock: true }]
    })
  }

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id))
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id)
    } else {
      setCart((prev) =>
        prev.map((item) => (item.id === id ? { ...item, quantity } : item))
      )
    }
  }

  const clearCart = () => {
    setCart([])
  }

  // Theme CSS variables
  const themeStyles = theme
    ? {
        "--primary": theme.primaryColor,
        "--accent": theme.accentColor,
        "--background": theme.backgroundColor,
        "--foreground": theme.textColor,
        "--radius": `${theme.borderRadius}px`,
      }
    : {}

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart }}>
      <LanguageContext.Provider value={{ language, setLanguage }}>
        <CurrencyContext.Provider value={{ currency, setCurrency }}>
          <ComparisonProvider>
            <div
              className="min-h-screen bg-background max-w-[1280px] mx-auto"
              style={themeStyles as React.CSSProperties}
            >
              <Header
                cartCount={cart.length}
                onCartClick={() => setIsCartOpen(true)}
                language={language}
                onLanguageChange={setLanguage}
                currency={currency}
                onCurrencyChange={setCurrency}
                shopName={theme?.shopName}
                logoUrl={theme?.logoUrl}
                primaryColor={theme?.primaryColor}
              />

              {currentPage === "shop" ? (
                children
              ) : (
                <CheckoutPage
                  cart={cart}
                  currency={currency}
                  language={language}
                  onBackToShop={() => setCurrentPage("shop")}
                  onOrderComplete={clearCart}
                />
              )}

              <CartDrawer
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                items={cart}
                onRemoveItem={removeFromCart}
                onUpdateQuantity={updateQuantity}
                onCheckout={() => {
                  setIsCartOpen(false)
                  setCurrentPage("checkout")
                }}
                onClearCart={clearCart}
                currency={currency}
                language={language}
              />

              {/* Floating compare bar */}
              <CompareFloatingBar
                language={language === "en" ? "EN" : "KH"}
                currency={currency}
                onViewCompare={() => router.push("/shop/compare")}
              />
            </div>
          </ComparisonProvider>
        </CurrencyContext.Provider>
      </LanguageContext.Provider>
    </CartContext.Provider>
  )
}
