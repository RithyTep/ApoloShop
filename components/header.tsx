"use client"

import { ShoppingCart, Globe, DollarSign } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
            <span className="font-bold text-xl text-foreground hidden sm:inline">Simple Shop</span>
          </div>

          {/* Center - Dropdowns */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Language Dropdown */}
            <Select value={language} onValueChange={(value) => onLanguageChange(value as "EN" | "KH")}>
              <SelectTrigger className="w-[100px] sm:w-[130px] h-9">
                <Globe className="h-4 w-4 mr-1 sm:mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EN">
                  <span className="flex items-center gap-2">
                    <span>🇺🇸</span>
                    <span>English</span>
                  </span>
                </SelectItem>
                <SelectItem value="KH">
                  <span className="flex items-center gap-2">
                    <span>🇰🇭</span>
                    <span>ខ្មែរ</span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Currency Dropdown */}
            <Select value={currency} onValueChange={(value) => onCurrencyChange(value as "USD" | "KHR")}>
              <SelectTrigger className="w-[90px] sm:w-[120px] h-9">
                <DollarSign className="h-4 w-4 mr-1 sm:mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">
                  <span className="flex items-center gap-2">
                    <span>$</span>
                    <span>USD</span>
                  </span>
                </SelectItem>
                <SelectItem value="KHR">
                  <span className="flex items-center gap-2">
                    <span>៛</span>
                    <span>KHR</span>
                  </span>
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
