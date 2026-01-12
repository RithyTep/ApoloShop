"use client"

import { useState, useEffect, useCallback } from "react"

const WISHLIST_STORAGE_KEY = "apoloshop_wishlist"
const GUEST_ID_STORAGE_KEY = "apoloshop_guest_id"

interface WishlistProduct {
  id: string
  nameEn: string
  nameKh: string
  priceUsd: number
  priceKhr: number
  imageUrl: string | null
  category?: {
    id: string
    nameEn: string
    nameKh: string
    slug: string
  } | null
  inventory?: {
    quantity: number
  } | null
}

interface WishlistItem {
  id: string
  productId: string
  createdAt: string
  product: WishlistProduct
}

// Generate a unique guest ID
function generateGuestId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

// Get or create guest ID from localStorage
function getGuestId(): string {
  if (typeof window === "undefined") return ""

  let guestId = localStorage.getItem(GUEST_ID_STORAGE_KEY)
  if (!guestId) {
    guestId = generateGuestId()
    localStorage.setItem(GUEST_ID_STORAGE_KEY, guestId)
  }
  return guestId
}

/**
 * Hook for managing wishlist functionality
 * - Uses localStorage for guest users (offline-first)
 * - Can sync with database API when needed
 */
export function useWishlist() {
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set())
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [guestId, setGuestId] = useState<string>("")

  // Load wishlist from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return

    const storedIds = localStorage.getItem(WISHLIST_STORAGE_KEY)
    if (storedIds) {
      try {
        const ids = JSON.parse(storedIds) as string[]
        setWishlistIds(new Set(ids))
      } catch {
        localStorage.removeItem(WISHLIST_STORAGE_KEY)
      }
    }

    setGuestId(getGuestId())
    setIsLoading(false)
  }, [])

  // Save wishlist to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === "undefined" || isLoading) return

    localStorage.setItem(
      WISHLIST_STORAGE_KEY,
      JSON.stringify(Array.from(wishlistIds))
    )
  }, [wishlistIds, isLoading])

  // Check if a product is in the wishlist
  const isInWishlist = useCallback(
    (productId: string): boolean => {
      return wishlistIds.has(productId)
    },
    [wishlistIds]
  )

  // Add a product to the wishlist
  const addToWishlist = useCallback(
    async (productId: string): Promise<boolean> => {
      if (wishlistIds.has(productId)) return false

      // Update local state immediately (optimistic update)
      setWishlistIds((prev) => new Set([...prev, productId]))

      // Try to sync with API (non-blocking)
      try {
        await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, guestId }),
        })
      } catch (error) {
        // API sync failed, but local state is already updated
        console.warn("Failed to sync wishlist to server:", error)
      }

      return true
    },
    [wishlistIds, guestId]
  )

  // Remove a product from the wishlist
  const removeFromWishlist = useCallback(
    async (productId: string): Promise<boolean> => {
      if (!wishlistIds.has(productId)) return false

      // Update local state immediately (optimistic update)
      setWishlistIds((prev) => {
        const next = new Set(prev)
        next.delete(productId)
        return next
      })

      // Update wishlist items if loaded
      setWishlistItems((prev) => prev.filter((item) => item.productId !== productId))

      // Try to sync with API (non-blocking)
      try {
        await fetch(
          `/api/wishlist?productId=${productId}&guestId=${encodeURIComponent(guestId)}`,
          { method: "DELETE" }
        )
      } catch (error) {
        console.warn("Failed to sync wishlist removal to server:", error)
      }

      return true
    },
    [wishlistIds, guestId]
  )

  // Toggle a product in the wishlist
  const toggleWishlist = useCallback(
    async (productId: string): Promise<boolean> => {
      if (wishlistIds.has(productId)) {
        return removeFromWishlist(productId)
      } else {
        return addToWishlist(productId)
      }
    },
    [wishlistIds, addToWishlist, removeFromWishlist]
  )

  // Clear the entire wishlist
  const clearWishlist = useCallback(() => {
    setWishlistIds(new Set())
    setWishlistItems([])
    if (typeof window !== "undefined") {
      localStorage.removeItem(WISHLIST_STORAGE_KEY)
    }
  }, [])

  // Fetch full wishlist items from API (with product details)
  const fetchWishlistItems = useCallback(async (): Promise<WishlistItem[]> => {
    if (!guestId) return []

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/wishlist?guestId=${encodeURIComponent(guestId)}`
      )

      if (!response.ok) {
        throw new Error("Failed to fetch wishlist")
      }

      const data = await response.json()
      const items = data.items as WishlistItem[]
      setWishlistItems(items)

      // Sync local wishlist IDs with server response
      const serverIds = new Set(items.map((item) => item.productId))
      setWishlistIds(serverIds)

      return items
    } catch (error) {
      console.error("Error fetching wishlist items:", error)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [guestId])

  // Get count of items in wishlist
  const wishlistCount = wishlistIds.size

  return {
    wishlistIds: Array.from(wishlistIds),
    wishlistItems,
    wishlistCount,
    isLoading,
    guestId,
    isInWishlist,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    clearWishlist,
    fetchWishlistItems,
  }
}
