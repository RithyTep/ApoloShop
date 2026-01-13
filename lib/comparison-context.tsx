"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"
import { Product } from "./api-hooks"

const MAX_COMPARE_PRODUCTS = 4
const STORAGE_KEY = "apolo_compare_products"

export interface ComparisonContextType {
  compareProducts: Product[]
  addToCompare: (product: Product) => boolean
  removeFromCompare: (productId: string) => void
  clearCompare: () => void
  isInCompare: (productId: string) => boolean
  canAddMore: boolean
  getShareableUrl: () => string
}

const ComparisonContext = createContext<ComparisonContextType | null>(null)

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const [compareProducts, setCompareProducts] = useState<Product[]>(() => {
    // Load from localStorage on initial render (client-side only)
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          return JSON.parse(stored)
        }
      } catch {
        // Ignore parse errors
      }
    }
    return []
  })

  // Persist to localStorage whenever products change
  const persistProducts = useCallback((products: Product[]) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
    }
  }, [])

  const addToCompare = useCallback((product: Product): boolean => {
    let added = false
    setCompareProducts((prev) => {
      // Check if already at max
      if (prev.length >= MAX_COMPARE_PRODUCTS) {
        return prev
      }
      // Check if already in list
      if (prev.some((p) => p.id === product.id)) {
        return prev
      }
      added = true
      const newProducts = [...prev, product]
      persistProducts(newProducts)
      return newProducts
    })
    return added
  }, [persistProducts])

  const removeFromCompare = useCallback((productId: string) => {
    setCompareProducts((prev) => {
      const newProducts = prev.filter((p) => p.id !== productId)
      persistProducts(newProducts)
      return newProducts
    })
  }, [persistProducts])

  const clearCompare = useCallback(() => {
    setCompareProducts([])
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const isInCompare = useCallback((productId: string) => {
    return compareProducts.some((p) => p.id === productId)
  }, [compareProducts])

  const canAddMore = compareProducts.length < MAX_COMPARE_PRODUCTS

  const getShareableUrl = useCallback(() => {
    if (typeof window === "undefined") return ""
    const ids = compareProducts.map((p) => p.id).join(",")
    return `${window.location.origin}/shop/compare?ids=${ids}`
  }, [compareProducts])

  return (
    <ComparisonContext.Provider
      value={{
        compareProducts,
        addToCompare,
        removeFromCompare,
        clearCompare,
        isInCompare,
        canAddMore,
        getShareableUrl,
      }}
    >
      {children}
    </ComparisonContext.Provider>
  )
}

export function useComparison() {
  const context = useContext(ComparisonContext)
  if (!context) {
    throw new Error("useComparison must be used within a ComparisonProvider")
  }
  return context
}

export { MAX_COMPARE_PRODUCTS }
