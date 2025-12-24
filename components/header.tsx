"use client"

import { ShoppingCart } from "lucide-react"
import { StoreStatus } from "@/components/shop/store-status"

interface HeaderProps {
  cartCount: number
  onCartClick: () => void
  language: "EN" | "KH"
  onLanguageChange: (lang: "EN" | "KH") => void
  currency: "USD" | "KHR"
  onCurrencyChange: (curr: "USD" | "KHR") => void
  shopName?: string
  logoUrl?: string
  primaryColor?: string
  showStoreStatus?: boolean
}

export function Header({
  cartCount,
  onCartClick,
  language,
  onLanguageChange,
  currency,
  onCurrencyChange,
  shopName = "Simple Shop",
  logoUrl,
  primaryColor,
  showStoreStatus = true,
}: HeaderProps) {
  return (
    <>
      {/* Minimal Header */}
      <header className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt={shopName} className="h-8 w-auto object-contain" />
              ) : (
                <div
                  className="w-8 h-8 rounded-sm flex items-center justify-center"
                  style={{ backgroundColor: primaryColor || "var(--primary)" }}
                >
                  <span className="text-white font-bold text-lg">
                    {shopName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="font-semibold text-lg text-foreground hidden sm:inline">{shopName}</span>
              {showStoreStatus && <StoreStatus language={language} />}
            </div>

            {/* Right side: Settings + Cart */}
            <div className="flex items-center gap-4">
              {/* Language/Currency toggles - minimal text buttons */}
              <div className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
                <button
                  onClick={() => onLanguageChange(language === "EN" ? "KH" : "EN")}
                  className="hover:text-foreground transition-colors px-1"
                >
                  {language === "EN" ? "EN" : "ខ្មែរ"}
                </button>
                <span className="text-border">|</span>
                <button
                  onClick={() => onCurrencyChange(currency === "USD" ? "KHR" : "USD")}
                  className="hover:text-foreground transition-colors px-1"
                >
                  {currency === "USD" ? "$" : "៛"}
                </button>
              </div>

              {/* Cart Icon */}
              <button onClick={onCartClick} className="relative p-2 hover:bg-muted transition-colors rounded-full">
                <ShoppingCart size={22} className="text-foreground" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile bottom bar for language/currency */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-40 py-2 px-4">
        <div className="flex items-center justify-center gap-6 text-sm">
          <button
            onClick={() => onLanguageChange(language === "EN" ? "KH" : "EN")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {language === "EN" ? "English" : "ខ្មែរ"}
          </button>
          <span className="text-border">•</span>
          <button
            onClick={() => onCurrencyChange(currency === "USD" ? "KHR" : "USD")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {currency === "USD" ? "USD $" : "KHR ៛"}
          </button>
        </div>
      </div>
    </>
  )
}
