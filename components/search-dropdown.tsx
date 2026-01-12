"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { Product } from "@/lib/api-hooks"

interface SearchResult {
  products: Product[]
  query: string
  total: number
}

interface SearchDropdownProps {
  query: string
  isOpen: boolean
  onClose: () => void
  onProductSelect?: (product: Product) => void
  language: "EN" | "KH"
  currency: "USD" | "KHR"
}

export function SearchDropdown({
  query,
  isOpen,
  onClose,
  onProductSelect,
  language,
  currency,
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

  const noResultsText = language === "EN" ? "No results found" : "រកមិនឃើញលទ្ធផល"
  const searchingText = language === "EN" ? "Searching..." : "កំពុងស្វែងរក..."

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden"
    >
      {isLoading ? (
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center pt-1">{searchingText}</p>
        </div>
      ) : results && results.products.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground text-sm">
          {noResultsText}
        </div>
      ) : results && results.products.length > 0 ? (
        <div className="py-1">
          {results.products.map((product, index) => (
            <div
              key={product.id}
              onClick={() => handleProductSelect(product)}
              className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                index === highlightedIndex ? "bg-muted" : "hover:bg-muted"
              }`}
            >
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={getProductName(product)}
                  className="w-10 h-10 rounded object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">N/A</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{getProductName(product)}</p>
                <p className="text-xs text-muted-foreground">{formatPrice(product)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
