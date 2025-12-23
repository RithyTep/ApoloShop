"use client"

import { ShoppingCart } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
}: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 bg-background border-b border-border z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
            <span className="font-bold text-xl text-foreground hidden sm:inline">{shopName}</span>
          </div>

          {/* Center - Dropdowns */}
          <div className="flex items-center gap-2">
            {/* Language Dropdown */}
            <Select value={language} onValueChange={(value) => onLanguageChange(value as "EN" | "KH")}>
              <SelectTrigger className="h-9 w-auto gap-1 px-3 border-none bg-muted/50 hover:bg-muted">
                <span className="text-base">{language === "EN" ? "English" : "ខ្មែរ"}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EN">
                  <span className="flex items-center gap-2">English</span>
                </SelectItem>
                <SelectItem value="KH">
                  <span className="flex items-center gap-2">ខ្មែរ</span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Currency Dropdown */}
            <Select value={currency} onValueChange={(value) => onCurrencyChange(value as "USD" | "KHR")}>
              <SelectTrigger className="h-9 w-auto gap-1 px-3 border-none bg-muted/50 hover:bg-muted">
                <span className="text-sm font-medium">{currency}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">
                  <span className="flex items-center gap-2">USD</span>
                </SelectItem>
                <SelectItem value="KHR">
                  <span className="flex items-center gap-2">KHR</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cart Icon */}
          <button onClick={onCartClick} className="relative p-2 hover:bg-muted transition-colors rounded">
            <ShoppingCart size={24} className="text-foreground" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
