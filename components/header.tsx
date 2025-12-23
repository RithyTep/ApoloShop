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
          <div className="flex items-center gap-1">
            {/* Language Dropdown */}
            <Select value={language} onValueChange={(value) => onLanguageChange(value as "EN" | "KH")}>
              <SelectTrigger className="w-[50px] h-8 px-2">
                <span className="text-lg">{language === "EN" ? "🇺🇸" : "🇰🇭"}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EN">🇺🇸</SelectItem>
                <SelectItem value="KH">🇰🇭</SelectItem>
              </SelectContent>
            </Select>

            {/* Currency Dropdown */}
            <Select value={currency} onValueChange={(value) => onCurrencyChange(value as "USD" | "KHR")}>
              <SelectTrigger className="w-[50px] h-8 px-2">
                <span className="text-lg">{currency === "USD" ? "$" : "៛"}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">$</SelectItem>
                <SelectItem value="KHR">៛</SelectItem>
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
