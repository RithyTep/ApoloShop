"use client"

import { ShoppingCart, Search } from "lucide-react"
import { StoreStatus } from "@/components/shop/store-status"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { SearchDropdown } from "@/components/search-dropdown"
import { translations } from "@/lib/i18n"

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
  searchQuery?: string
  onSearchChange?: (query: string) => void
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
  searchQuery: externalSearchQuery,
  onSearchChange,
}: HeaderProps) {
  const [internalSearchQuery, setInternalSearchQuery] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery

  const handleSearchChange = (value: string) => {
    if (onSearchChange) {
      onSearchChange(value)
    } else {
      setInternalSearchQuery(value)
    }
    setIsSearchOpen(value.trim().length > 0)
  }

  const handleSearchClose = () => {
    setIsSearchOpen(false)
  }

  const handleProductSelect = () => {
    // Clear search input and close dropdown after navigation
    if (onSearchChange) {
      onSearchChange("")
    } else {
      setInternalSearchQuery("")
    }
    setIsSearchOpen(false)
  }

  const t = translations[language === "EN" ? "en" : "kh"]
  const searchPlaceholder = t.search.placeholder
  return (
    <header className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          {/* Logo & Shop Name */}
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

          {/* Search Input - responsive: full width on mobile row, fixed width on desktop */}
          <div className="hidden sm:flex flex-1 max-w-xs mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
              <Input
                type="search"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => searchQuery.trim() && setIsSearchOpen(true)}
                className="pl-9 h-9 rounded-full"
              />
              <SearchDropdown
                query={searchQuery}
                isOpen={isSearchOpen}
                onClose={handleSearchClose}
                onProductSelect={handleProductSelect}
                language={language}
                currency={currency}
              />
            </div>
          </div>

          {/* Right side: Pill Toggles + Cart */}
          <div className="flex items-center gap-2">
            {/* Language Pill Toggle */}
            <div className="flex items-center bg-muted rounded-full p-0.5">
              <button
                onClick={() => onLanguageChange("EN")}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all ${
                  language === "EN"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                EN
              </button>
              <button
                onClick={() => onLanguageChange("KH")}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all ${
                  language === "KH"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                ខ្មែរ
              </button>
            </div>

            {/* Currency Pill Toggle */}
            <div className="flex items-center bg-muted rounded-full p-0.5">
              <button
                onClick={() => onCurrencyChange("USD")}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all ${
                  currency === "USD"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                $
              </button>
              <button
                onClick={() => onCurrencyChange("KHR")}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all ${
                  currency === "KHR"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                ៛
              </button>
            </div>

            {/* Cart Icon */}
            <button onClick={onCartClick} className="relative p-2 hover:bg-muted transition-colors rounded-full ml-1">
              <ShoppingCart size={22} className="text-foreground" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search - full width on mobile only */}
        <div className="sm:hidden mt-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input
              type="search"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => searchQuery.trim() && setIsSearchOpen(true)}
              className="pl-9 h-9 rounded-full w-full"
            />
            <SearchDropdown
              query={searchQuery}
              isOpen={isSearchOpen}
              onClose={handleSearchClose}
              onProductSelect={handleProductSelect}
              language={language}
              currency={currency}
            />
          </div>
        </div>
      </div>
    </header>
  )
}
