"use client"

import { useState, useEffect, useCallback } from "react"

const STORAGE_KEY = "recentlyViewedProducts"
const MAX_ITEMS = 10

/**
 * Hook to manage recently viewed products in localStorage
 * Stores product IDs (max 10), most recent first
 */
export function useRecentlyViewed() {
  const [viewedIds, setViewedIds] = useState<string[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setViewedIds(parsed.slice(0, MAX_ITEMS))
        }
      }
    } catch {
      // Invalid JSON, reset
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  // Add a product ID to recently viewed
  const addViewedProduct = useCallback((productId: string) => {
    if (typeof window === "undefined") return

    setViewedIds((prev) => {
      // Remove if already exists, then add to front
      const filtered = prev.filter((id) => id !== productId)
      const updated = [productId, ...filtered].slice(0, MAX_ITEMS)

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch {
        // localStorage full or disabled
      }

      return updated
    })
  }, [])

  // Clear all recently viewed products
  const clearRecentlyViewed = useCallback(() => {
    if (typeof window === "undefined") return

    setViewedIds([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // localStorage disabled
    }
  }, [])

  // Get IDs excluding a specific product (useful for showing on product page)
  const getViewedExcluding = useCallback(
    (excludeId?: string): string[] => {
      if (!excludeId) return viewedIds
      return viewedIds.filter((id) => id !== excludeId)
    },
    [viewedIds]
  )

  return {
    viewedIds,
    addViewedProduct,
    clearRecentlyViewed,
    getViewedExcluding,
  }
}
