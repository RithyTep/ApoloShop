"use client"

import { ShoppingCart, Search } from "lucide-react"
import { StoreStatus } from "@/components/shop/store-status"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { SearchDropdown } from "@/components/search-dropdown"
import { getTranslation, type Language, SUPPORTED_LANGUAGES, getLanguageConfig } from "@/lib/i18n"
import { LanguageSwitcher } from "@/components/language-switcher"

interface SearchBranding {
  primaryColor?: string
  accentColor?: string
  customNoResultsMessage?: { en?: string; kh?: string }
  borderRadius?: number
}

interface HeaderProps {
  cartCount: number
  onCartClick: () => void
  language: Language
  onLanguageChange: (lang: Language) => void
  currency: "USD" | "KHR"
  onCurrencyChange: (curr: "USD" | "KHR") => void
  shopName?: string
  logoUrl?: string
  primaryColor?: string
  showStoreStatus?: boolean
  searchQuery?: string
  onSearchChange?: (query: string) => void
  searchBranding?: SearchBranding
  showAllLanguages?: boolean // Show full language dropdown vs simple EN/KH toggle
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
  searchBranding,
  showAllLanguages = false,
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

  const t = getTranslation(language)
  const searchPlaceholder = t.search.placeholder
  const isEnglish = language === "en"
  return (
    <header className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border z-40" role="banner">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          {/* Logo & Shop Name */}
          <a href="/" className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm" aria-label={`${shopName} - ${t.accessibility.home}`}>
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-8 w-auto object-contain" aria-hidden="true" />
            ) : (
              <div
                className="w-8 h-8 rounded-sm flex items-center justify-center"
                style={{ backgroundColor: primaryColor || "var(--primary)" }}
                aria-hidden="true"
              >
                <span className="text-white font-bold text-lg">
                  {shopName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="font-semibold text-lg text-foreground hidden sm:inline">{shopName}</span>
            {showStoreStatus && <StoreStatus language={language} />}
          </a>

          {/* Search Input - responsive: full width on mobile row, fixed width on desktop */}
          <div className="hidden sm:flex flex-1 max-w-xs mx-4" role="search" aria-label={t.accessibility.productSearch}>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" aria-hidden="true" />
              <Input
                type="search"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => searchQuery.trim() && setIsSearchOpen(true)}
                className="pl-9 h-9 rounded-full focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label={t.accessibility.searchProducts}
                aria-autocomplete="list"
                aria-expanded={isSearchOpen}
                aria-controls="search-results"
              />
              <SearchDropdown
                query={searchQuery}
                isOpen={isSearchOpen}
                onClose={handleSearchClose}
                onProductSelect={handleProductSelect}
                language={language}
                currency={currency}
                branding={searchBranding}
              />
            </div>
          </div>

          {/* Right side: Language, Currency, Cart */}
          <nav className="flex items-center gap-2" aria-label={t.accessibility.siteSettings}>
            {/* Language Switcher - show dropdown or simple toggle based on showAllLanguages */}
            {showAllLanguages ? (
              <LanguageSwitcher
                currentLanguage={language}
                onLanguageChange={onLanguageChange}
                variant="compact"
              />
            ) : (
              <div className="flex items-center bg-muted rounded-full p-0.5" role="group" aria-label={t.accessibility.languageSelection}>
                <button
                  onClick={() => onLanguageChange("en")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${
                    language === "en"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-pressed={language === "en"}
                  aria-label="English"
                >
                  EN
                </button>
                <button
                  onClick={() => onLanguageChange("kh")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${
                    language === "kh"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-pressed={language === "kh"}
                  aria-label="Khmer"
                >
                  ខ្មែរ
                </button>
              </div>
            )}

            {/* Currency Pill Toggle */}
            <div className="flex items-center bg-muted rounded-full p-0.5" role="group" aria-label={t.accessibility.currencySelection}>
              <button
                onClick={() => onCurrencyChange("USD")}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${
                  currency === "USD"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={currency === "USD"}
                aria-label="US Dollar"
              >
                $
              </button>
              <button
                onClick={() => onCurrencyChange("KHR")}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${
                  currency === "KHR"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={currency === "KHR"}
                aria-label="Cambodian Riel"
              >
                ៛
              </button>
            </div>

            {/* Cart Icon */}
            <button
              onClick={onCartClick}
              className="relative p-2 hover:bg-muted transition-colors rounded-full ml-1 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label={`${t.accessibility.shoppingCart}, ${cartCount} ${t.accessibility.items}`}
            >
              <ShoppingCart size={22} className="text-foreground" aria-hidden="true" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full" aria-hidden="true">
                  {cartCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Mobile Search - full width on mobile only */}
        <div className="sm:hidden mt-3" role="search" aria-label={t.accessibility.productSearch}>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" aria-hidden="true" />
            <Input
              type="search"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => searchQuery.trim() && setIsSearchOpen(true)}
              className="pl-9 h-9 rounded-full w-full focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label={t.accessibility.searchProducts}
              aria-autocomplete="list"
              aria-expanded={isSearchOpen}
              aria-controls="search-results-mobile"
            />
            <SearchDropdown
              query={searchQuery}
              isOpen={isSearchOpen}
              onClose={handleSearchClose}
              onProductSelect={handleProductSelect}
              language={language}
              currency={currency}
              branding={searchBranding}
            />
          </div>
        </div>
      </div>
    </header>
  )
}
