"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { Product } from "@/lib/api-hooks"
import { translations } from "@/lib/i18n"
import { trackSearch } from "@/lib/ga4"

interface SearchResult {
  products: Product[]
  query: string
  total: number
}

interface SearchBranding {
  primaryColor?: string
  accentColor?: string
  customNoResultsMessage?: { en?: string; kh?: string }
  borderRadius?: number
}

interface SearchDropdownProps {
  query: string
  isOpen: boolean
  onClose: () => void
  onProductSelect?: (product: Product) => void
  language: "EN" | "KH"
  currency: "USD" | "KHR"
  branding?: SearchBranding
}

export function SearchDropdown({
  query,
  isOpen,
  onClose,
  onProductSelect,
  language,
  currency,
  branding,
}: SearchDropdownProps) {
  const router = useRouter()
  const [results, setResults] = useState<SearchResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults(null)
      return
    }

    setIsLoading(true)
    const timer = setTimeout(async () => {
      try {
        // Track GA4 search event
        trackSearch(query.trim())

        const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}&limit=5`)
        const data = await res.json()
        setResults(data)
      } catch (error) {
        console.error("Search error:", error)
        setResults({ products: [], query, total: 0 })
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Reset highlighted index when results change
  useEffect(() => {
    setHighlightedIndex(-1)
  }, [results])

  // Handle product selection (click or Enter key)
  const handleProductSelect = useCallback((product: Product) => {
    router.push(`/shop/product/${product.id}`)
    onClose()
    onProductSelect?.(product)
  }, [router, onClose, onProductSelect])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || !results?.products.length) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setHighlightedIndex(prev =>
            prev < results.products.length - 1 ? prev + 1 : prev
          )
          break
        case "ArrowUp":
          e.preventDefault()
          setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0))
          break
        case "Enter":
          e.preventDefault()
          if (highlightedIndex >= 0 && results.products[highlightedIndex]) {
            handleProductSelect(results.products[highlightedIndex])
          }
          break
        case "Escape":
          e.preventDefault()
          onClose()
          break
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, results, highlightedIndex, handleProductSelect, onClose])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen || !query.trim()) {
    return null
  }

  const formatPrice = (product: Product) => {
    if (currency === "USD") {
      return `$${Number(product.priceUsd).toFixed(2)}`
    }
    return `${Number(product.priceKhr).toLocaleString()}៛`
  }

  const getProductName = (product: Product) => {
    return language === "EN" ? product.nameEn : product.nameKh
  }

  const t = translations[language === "EN" ? "en" : "kh"]
  const langKey = language === "EN" ? "en" : "kh"

  // Use custom no results message from branding if provided, otherwise use default translation
  const noResultsText = branding?.customNoResultsMessage?.[langKey] || t.search.noResults
  const searchingText = t.search.searching

  // Build custom styles from branding
  const dropdownStyles: React.CSSProperties = {
    ...(branding?.borderRadius !== undefined && { borderRadius: `${branding.borderRadius}px` }),
  }

  // Highlight style for selected item (using shop's primary color)
  const getHighlightStyle = (isHighlighted: boolean): React.CSSProperties => {
    if (!isHighlighted || !branding?.primaryColor) {
      return {}
    }
    return {
      backgroundColor: branding.primaryColor,
      color: "#ffffff",
    }
  }

  return (
    <div
      ref={dropdownRef}
      id="search-results"
      className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden"
      style={dropdownStyles}
      role="listbox"
      aria-label={language === "EN" ? "Search results" : "លទ្ធផលស្វែងរក"}
      aria-live="polite"
    >
      {isLoading ? (
        <div className="p-3 space-y-2" role="status" aria-label={searchingText}>
          <div className="flex items-center gap-3" aria-hidden="true">
            <Skeleton className="w-10 h-10 rounded" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
          <div className="flex items-center gap-3" aria-hidden="true">
            <Skeleton className="w-10 h-10 rounded" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center pt-1">{searchingText}</p>
        </div>
      ) : results && results.products.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground text-sm" role="status">
          {noResultsText}
        </div>
      ) : results && results.products.length > 0 ? (
        <div className="py-1" role="group" aria-label={language === "EN" ? `${results.products.length} results found` : `រកឃើញ ${results.products.length} លទ្ធផល`}>
          {results.products.map((product, index) => {
            const isHighlighted = index === highlightedIndex
            const highlightStyle = getHighlightStyle(isHighlighted)
            const hasCustomHighlight = isHighlighted && branding?.primaryColor
            const productName = getProductName(product)
            const price = formatPrice(product)

            return (
              <div
                key={product.id}
                id={`search-result-${product.id}`}
                onClick={() => handleProductSelect(product)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    handleProductSelect(product)
                  }
                }}
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                  !hasCustomHighlight && isHighlighted ? "bg-muted" : ""
                } ${!hasCustomHighlight && !isHighlighted ? "hover:bg-muted" : ""}`}
                style={highlightStyle}
                role="option"
                aria-selected={isHighlighted}
                aria-label={`${productName}, ${price}`}
                tabIndex={isHighlighted ? 0 : -1}
              >
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt=""
                    className="w-10 h-10 rounded object-cover"
                    aria-hidden="true"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center" aria-hidden="true">
                    <span className="text-xs text-muted-foreground">N/A</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{productName}</p>
                  <p
                    className={hasCustomHighlight ? "text-xs opacity-80" : "text-xs text-muted-foreground"}
                  >
                    {price}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
