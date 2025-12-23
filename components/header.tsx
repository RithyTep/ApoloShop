"use client"

import { ShoppingCart } from "phosphor-react"

interface HeaderProps {
  cartCount: number
  onCartClick: () => void
  language: "EN" | "KH"
  onLanguageChange: (lang: "EN" | "KH") => void
  currency: "USD" | "KHR"
  onCurrencyChange: (curr: "USD" | "KHR") => void
}

export function Header({
  cartCount,
  onCartClick,
  language,
  onLanguageChange,
  currency,
  onCurrencyChange,
}: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 bg-background border-b border-border z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">S</span>
            </div>
            <span className="font-bold text-xl text-foreground">Simple Shop</span>
          </div>

          {/* Center - Toggles */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-2 bg-muted px-3 py-2">
              <button
                onClick={() => onLanguageChange("EN")}
                className={`text-sm font-medium transition-colors ${
                  language === "EN" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                EN
              </button>
              <span className="text-muted-foreground">/</span>
              <button
                onClick={() => onLanguageChange("KH")}
                className={`text-sm font-medium transition-colors ${
                  language === "KH" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                ខ
              </button>
            </div>

            <div className="flex items-center gap-2 bg-muted px-3 py-2">
              <button
                onClick={() => onCurrencyChange("USD")}
                className={`text-sm font-medium transition-colors ${
                  currency === "USD" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                USD
              </button>
              <span className="text-muted-foreground">/</span>
              <button
                onClick={() => onCurrencyChange("KHR")}
                className={`text-sm font-medium transition-colors ${
                  currency === "KHR" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                KHR
              </button>
            </div>
          </div>

          {/* Cart Icon */}
          <button onClick={onCartClick} className="relative p-2 hover:bg-muted transition-colors">
            <ShoppingCart size={24} className="text-foreground" />
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 bg-primary text-primary-foreground text-xs font-bold w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Mobile toggles */}
        <div className="sm:hidden flex items-center gap-2 mt-3 justify-center">
          <div className="flex items-center gap-1 bg-muted px-2 py-1 text-xs">
            <button
              onClick={() => onLanguageChange("EN")}
              className={`px-1 font-medium transition-colors ${
                language === "EN" ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              EN
            </button>
            <span className="text-muted-foreground">/</span>
            <button
              onClick={() => onLanguageChange("KH")}
              className={`px-1 font-medium transition-colors ${
                language === "KH" ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              ខ
            </button>
          </div>
          <div className="flex items-center gap-1 bg-muted px-2 py-1 text-xs">
            <button
              onClick={() => onCurrencyChange("USD")}
              className={`px-1 font-medium transition-colors ${
                currency === "USD" ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              $
            </button>
            <span className="text-muted-foreground">/</span>
            <button
              onClick={() => onCurrencyChange("KHR")}
              className={`px-1 font-medium transition-colors ${
                currency === "KHR" ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              ៛
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
