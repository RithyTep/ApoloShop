/**
 * Facebook Pixel integration for ApoloShop
 * Provides e-commerce tracking events for Facebook/Instagram ads
 *
 * Standard Events: ViewContent, AddToCart, Purchase
 * Custom Conversions: Supports custom conversion events
 */

// Type definitions for Facebook Pixel
declare global {
  interface Window {
    fbq: (
      command: "init" | "track" | "trackCustom" | "trackSingle" | "trackSingleCustom",
      eventNameOrPixelId: string,
      params?: Record<string, unknown>
    ) => void
    _fbq: typeof window.fbq
  }
}

// Product item for e-commerce events
export interface FBPixelProductItem {
  id: string
  name: string
  category?: string
  price: number
  quantity?: number
  currency?: string
  brand?: string
}

// Content type for ViewContent event
export type FBContentType = "product" | "product_group"

// Enhanced user data for Conversions API
export interface FBUserData {
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  externalId?: string
  clientIpAddress?: string
  clientUserAgent?: string
  fbc?: string // Facebook click ID
  fbp?: string // Facebook browser ID
}

// Check if Facebook Pixel is available
export function isFBPixelAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.fbq === "function"
}

// Safe fbq call that checks availability
function safeFbq(
  command: "init" | "track" | "trackCustom" | "trackSingle" | "trackSingleCustom",
  eventNameOrPixelId: string,
  params?: Record<string, unknown>
): void {
  if (isFBPixelAvailable()) {
    if (params) {
      window.fbq(command, eventNameOrPixelId, params)
    } else {
      window.fbq(command, eventNameOrPixelId)
    }
  }
}

// ============================================
// STANDARD E-COMMERCE EVENTS
// ============================================

/**
 * Track when a user views a product (ViewContent)
 * Trigger on: Product detail page view
 */
export function trackViewContent(
  product: FBPixelProductItem,
  contentType: FBContentType = "product",
  currency: string = "USD"
): void {
  safeFbq("track", "ViewContent", {
    content_type: contentType,
    content_ids: [product.id],
    content_name: product.name,
    content_category: product.category,
    value: product.price,
    currency,
  })
}

/**
 * Track when a user views multiple products (ViewContent for list)
 * Trigger on: Category page, search results
 */
export function trackViewContentList(
  products: FBPixelProductItem[],
  contentType: FBContentType = "product",
  currency: string = "USD"
): void {
  const value = products.reduce((sum, item) => sum + item.price, 0)
  safeFbq("track", "ViewContent", {
    content_type: contentType,
    content_ids: products.map(p => p.id),
    value,
    currency,
  })
}

/**
 * Track when a user adds a product to cart (AddToCart)
 * Trigger on: Add to cart button click
 */
export function trackAddToCart(
  product: FBPixelProductItem,
  currency: string = "USD"
): void {
  safeFbq("track", "AddToCart", {
    content_type: "product",
    content_ids: [product.id],
    content_name: product.name,
    content_category: product.category,
    value: product.price * (product.quantity || 1),
    currency,
    contents: [{
      id: product.id,
      quantity: product.quantity || 1,
      item_price: product.price,
    }],
  })
}

/**
 * Track when a user initiates checkout (InitiateCheckout)
 * Trigger on: Checkout page view, checkout button click
 */
export function trackInitiateCheckout(
  products: FBPixelProductItem[],
  currency: string = "USD",
  numItems?: number
): void {
  const value = products.reduce(
    (sum, item) => sum + item.price * (item.quantity || 1),
    0
  )
  safeFbq("track", "InitiateCheckout", {
    content_type: "product",
    content_ids: products.map(p => p.id),
    value,
    currency,
    num_items: numItems ?? products.reduce((sum, item) => sum + (item.quantity || 1), 0),
    contents: products.map(p => ({
      id: p.id,
      quantity: p.quantity || 1,
      item_price: p.price,
    })),
  })
}

/**
 * Track when a user adds payment info (AddPaymentInfo)
 * Trigger on: Payment info form submission
 */
export function trackAddPaymentInfo(
  products: FBPixelProductItem[],
  currency: string = "USD"
): void {
  const value = products.reduce(
    (sum, item) => sum + item.price * (item.quantity || 1),
    0
  )
  safeFbq("track", "AddPaymentInfo", {
    content_type: "product",
    content_ids: products.map(p => p.id),
    value,
    currency,
    contents: products.map(p => ({
      id: p.id,
      quantity: p.quantity || 1,
      item_price: p.price,
    })),
  })
}

/**
 * Track completed purchase (Purchase)
 * Trigger on: Order confirmation
 */
export function trackPurchase(
  orderId: string,
  products: FBPixelProductItem[],
  value: number,
  currency: string = "USD"
): void {
  safeFbq("track", "Purchase", {
    content_type: "product",
    content_ids: products.map(p => p.id),
    value,
    currency,
    num_items: products.reduce((sum, item) => sum + (item.quantity || 1), 0),
    order_id: orderId,
    contents: products.map(p => ({
      id: p.id,
      quantity: p.quantity || 1,
      item_price: p.price,
    })),
  })
}

// ============================================
// ADDITIONAL STANDARD EVENTS
// ============================================

/**
 * Track search queries (Search)
 * Trigger on: Search form submission
 */
export function trackSearch(searchString: string, contentIds?: string[]): void {
  safeFbq("track", "Search", {
    search_string: searchString,
    content_ids: contentIds,
  })
}

/**
 * Track add to wishlist (AddToWishlist)
 * Trigger on: Wishlist button click
 */
export function trackAddToWishlist(
  product: FBPixelProductItem,
  currency: string = "USD"
): void {
  safeFbq("track", "AddToWishlist", {
    content_type: "product",
    content_ids: [product.id],
    content_name: product.name,
    content_category: product.category,
    value: product.price,
    currency,
  })
}

/**
 * Track lead generation (Lead)
 * Trigger on: Contact form submission, newsletter signup
 */
export function trackLead(
  currency?: string,
  value?: number
): void {
  safeFbq("track", "Lead", {
    currency,
    value,
  })
}

/**
 * Track registration complete (CompleteRegistration)
 * Trigger on: Account creation
 */
export function trackCompleteRegistration(
  status?: string,
  currency?: string,
  value?: number
): void {
  safeFbq("track", "CompleteRegistration", {
    status,
    currency,
    value,
  })
}

/**
 * Track contact (Contact)
 * Trigger on: Contact button click, phone call initiation
 */
export function trackContact(): void {
  safeFbq("track", "Contact")
}

/**
 * Track page view (PageView)
 * Automatically tracked by Pixel, but can be manually triggered
 */
export function trackPageView(): void {
  safeFbq("track", "PageView")
}

// ============================================
// CUSTOM CONVERSIONS
// ============================================

/**
 * Track custom conversion event
 * Use for any custom tracking needs
 */
export function trackCustomEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  safeFbq("trackCustom", eventName, params)
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convert cart item to FB Pixel product item format
 */
export function cartItemToFBItem(
  item: {
    id: string
    name: string
    price: number
    quantity: number
    category?: string
    brand?: string
  }
): FBPixelProductItem {
  return {
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    category: item.category,
    brand: item.brand,
  }
}

/**
 * Convert product to FB Pixel product item format
 */
export function productToFBItem(
  product: {
    id: string
    nameEn: string
    nameKh?: string
    priceUsd: number
    priceKhr?: number
    categoryNameEn?: string
    categoryNameKh?: string
  },
  language: "EN" | "KH" = "EN",
  currency: "USD" | "KHR" = "USD",
  quantity: number = 1
): FBPixelProductItem {
  return {
    id: product.id,
    name: language === "EN" ? product.nameEn : (product.nameKh || product.nameEn),
    price: currency === "USD" ? product.priceUsd : (product.priceKhr || product.priceUsd * 4100),
    quantity,
    category: language === "EN" ? product.categoryNameEn : product.categoryNameKh,
  }
}

/**
 * Get Facebook browser ID (fbp) from cookie
 */
export function getFacebookBrowserId(): string | undefined {
  if (typeof document === "undefined") return undefined
  const match = document.cookie.match(/_fbp=([^;]+)/)
  return match ? match[1] : undefined
}

/**
 * Get Facebook click ID (fbc) from URL or cookie
 */
export function getFacebookClickId(): string | undefined {
  if (typeof window === "undefined") return undefined

  // Check URL params first (fbclid)
  const urlParams = new URLSearchParams(window.location.search)
  const fbclid = urlParams.get("fbclid")
  if (fbclid) {
    return `fb.1.${Date.now()}.${fbclid}`
  }

  // Fall back to cookie
  const match = document.cookie.match(/_fbc=([^;]+)/)
  return match ? match[1] : undefined
}

/**
 * Hash user data for Conversions API
 * Uses SHA-256 hashing (should be done server-side for security)
 */
export async function hashUserData(value: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(value.toLowerCase().trim())
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}
