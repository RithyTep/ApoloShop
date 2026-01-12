/**
 * Google Analytics 4 (GA4) integration for ApoloShop
 * Provides e-commerce tracking events and custom event helpers
 */

// Type definitions for GA4 gtag
declare global {
  interface Window {
    gtag: (
      command: "config" | "event" | "js" | "set" | "consent",
      targetId: string | Date,
      config?: Record<string, unknown>
    ) => void
    dataLayer: unknown[]
  }
}

// Product item for e-commerce events
export interface GA4ProductItem {
  item_id: string
  item_name: string
  item_category?: string
  item_category2?: string
  price: number
  quantity?: number
  currency?: string
  item_variant?: string
  index?: number
}

// Enhanced conversion data for better attribution
export interface EnhancedConversionData {
  email?: string
  phone_number?: string
  address?: {
    first_name?: string
    last_name?: string
    street?: string
    city?: string
    region?: string
    postal_code?: string
    country?: string
  }
}

// Check if GA4 is available
export function isGA4Available(): boolean {
  return typeof window !== "undefined" && typeof window.gtag === "function"
}

// Safe gtag call that checks availability
function safeGtag(
  command: "config" | "event" | "js" | "set" | "consent",
  targetId: string | Date,
  config?: Record<string, unknown>
): void {
  if (isGA4Available()) {
    window.gtag(command, targetId, config)
  }
}

// ============================================
// E-COMMERCE EVENTS
// ============================================

/**
 * Track when a user views a product
 * Trigger on: Product detail page view
 */
export function trackViewItem(
  product: GA4ProductItem,
  currency: string = "USD"
): void {
  safeGtag("event", "view_item", {
    currency,
    value: product.price,
    items: [product],
  })
}

/**
 * Track when a user views a list of products
 * Trigger on: Category page, search results, featured products
 */
export function trackViewItemList(
  products: GA4ProductItem[],
  listName: string,
  listId?: string
): void {
  safeGtag("event", "view_item_list", {
    item_list_id: listId,
    item_list_name: listName,
    items: products.map((item, index) => ({ ...item, index })),
  })
}

/**
 * Track when a user clicks on a product in a list
 * Trigger on: Product card click from any list
 */
export function trackSelectItem(
  product: GA4ProductItem,
  listName?: string,
  listId?: string
): void {
  safeGtag("event", "select_item", {
    item_list_id: listId,
    item_list_name: listName,
    items: [product],
  })
}

/**
 * Track when a user adds a product to cart
 * Trigger on: Add to cart button click
 */
export function trackAddToCart(
  product: GA4ProductItem,
  currency: string = "USD"
): void {
  safeGtag("event", "add_to_cart", {
    currency,
    value: product.price * (product.quantity || 1),
    items: [product],
  })
}

/**
 * Track when a user removes a product from cart
 * Trigger on: Remove from cart action
 */
export function trackRemoveFromCart(
  product: GA4ProductItem,
  currency: string = "USD"
): void {
  safeGtag("event", "remove_from_cart", {
    currency,
    value: product.price * (product.quantity || 1),
    items: [product],
  })
}

/**
 * Track when a user views their cart
 * Trigger on: Cart drawer open, cart page view
 */
export function trackViewCart(
  products: GA4ProductItem[],
  currency: string = "USD"
): void {
  const value = products.reduce(
    (sum, item) => sum + item.price * (item.quantity || 1),
    0
  )
  safeGtag("event", "view_cart", {
    currency,
    value,
    items: products,
  })
}

/**
 * Track when a user begins checkout
 * Trigger on: Checkout page view, checkout button click
 */
export function trackBeginCheckout(
  products: GA4ProductItem[],
  currency: string = "USD",
  coupon?: string
): void {
  const value = products.reduce(
    (sum, item) => sum + item.price * (item.quantity || 1),
    0
  )
  safeGtag("event", "begin_checkout", {
    currency,
    value,
    coupon,
    items: products,
  })
}

/**
 * Track shipping info submission
 * Trigger on: After user submits shipping details
 */
export function trackAddShippingInfo(
  products: GA4ProductItem[],
  currency: string = "USD",
  shippingTier?: string,
  coupon?: string
): void {
  const value = products.reduce(
    (sum, item) => sum + item.price * (item.quantity || 1),
    0
  )
  safeGtag("event", "add_shipping_info", {
    currency,
    value,
    coupon,
    shipping_tier: shippingTier,
    items: products,
  })
}

/**
 * Track payment info submission
 * Trigger on: After user selects payment method
 */
export function trackAddPaymentInfo(
  products: GA4ProductItem[],
  currency: string = "USD",
  paymentType?: string,
  coupon?: string
): void {
  const value = products.reduce(
    (sum, item) => sum + item.price * (item.quantity || 1),
    0
  )
  safeGtag("event", "add_payment_info", {
    currency,
    value,
    coupon,
    payment_type: paymentType,
    items: products,
  })
}

/**
 * Track completed purchase
 * Trigger on: Order confirmation
 */
export function trackPurchase(
  transactionId: string,
  products: GA4ProductItem[],
  value: number,
  currency: string = "USD",
  options?: {
    tax?: number
    shipping?: number
    coupon?: string
  }
): void {
  safeGtag("event", "purchase", {
    transaction_id: transactionId,
    currency,
    value,
    tax: options?.tax,
    shipping: options?.shipping,
    coupon: options?.coupon,
    items: products,
  })
}

/**
 * Track refund (partial or full)
 * Trigger on: Order refund confirmation
 */
export function trackRefund(
  transactionId: string,
  value: number,
  currency: string = "USD",
  products?: GA4ProductItem[]
): void {
  safeGtag("event", "refund", {
    transaction_id: transactionId,
    currency,
    value,
    items: products,
  })
}

// ============================================
// ENHANCED CONVERSIONS
// ============================================

/**
 * Set user data for enhanced conversions
 * This improves conversion attribution by matching user data with Google accounts
 * Data is hashed by Google before being sent
 */
export function setEnhancedConversionData(data: EnhancedConversionData): void {
  if (!isGA4Available()) return

  const userData: Record<string, unknown> = {}

  if (data.email) {
    userData.email = data.email.toLowerCase().trim()
  }

  if (data.phone_number) {
    // Format phone number: remove all non-digits except leading +
    userData.phone_number = data.phone_number.replace(/[^\d+]/g, "")
  }

  if (data.address) {
    userData.address = {
      first_name: data.address.first_name?.trim(),
      last_name: data.address.last_name?.trim(),
      street: data.address.street?.trim(),
      city: data.address.city?.trim(),
      region: data.address.region?.trim(),
      postal_code: data.address.postal_code?.trim(),
      country: data.address.country?.trim(),
    }
  }

  // Set user data for enhanced conversions
  safeGtag("set", "user_data", userData)
}

// ============================================
// CUSTOM EVENTS
// ============================================

/**
 * Track search queries
 * Trigger on: Search form submission
 */
export function trackSearch(searchTerm: string): void {
  safeGtag("event", "search", {
    search_term: searchTerm,
  })
}

/**
 * Track newsletter signup
 * Trigger on: Newsletter form submission
 */
export function trackSignUp(method: string = "newsletter"): void {
  safeGtag("event", "sign_up", {
    method,
  })
}

/**
 * Track login
 * Trigger on: User login
 */
export function trackLogin(method: string = "email"): void {
  safeGtag("event", "login", {
    method,
  })
}

/**
 * Track share action
 * Trigger on: Social share button click
 */
export function trackShare(
  method: string,
  contentType: string,
  itemId?: string
): void {
  safeGtag("event", "share", {
    method,
    content_type: contentType,
    item_id: itemId,
  })
}

/**
 * Track wishlist addition
 * Trigger on: Add to wishlist button click
 */
export function trackAddToWishlist(
  product: GA4ProductItem,
  currency: string = "USD"
): void {
  safeGtag("event", "add_to_wishlist", {
    currency,
    value: product.price,
    items: [product],
  })
}

/**
 * Track contact form submission
 * Trigger on: Contact/support form submission
 */
export function trackGenerateLead(currency?: string, value?: number): void {
  safeGtag("event", "generate_lead", {
    currency,
    value,
  })
}

/**
 * Track page view (manual trigger)
 * Trigger on: Custom page transitions if needed
 */
export function trackPageView(
  pagePath: string,
  pageTitle?: string,
  pageLocation?: string
): void {
  safeGtag("event", "page_view", {
    page_path: pagePath,
    page_title: pageTitle,
    page_location: pageLocation || (typeof window !== "undefined" ? window.location.href : undefined),
  })
}

/**
 * Track custom event
 * Use for any custom tracking needs
 */
export function trackCustomEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  safeGtag("event", eventName, params)
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convert cart item to GA4 product item format
 */
export function cartItemToGA4Item(
  item: {
    id: string
    name: string
    price: number
    quantity: number
    category?: string
    variant?: string
  },
  index?: number
): GA4ProductItem {
  return {
    item_id: item.id,
    item_name: item.name,
    price: item.price,
    quantity: item.quantity,
    item_category: item.category,
    item_variant: item.variant,
    index,
  }
}

/**
 * Convert product to GA4 product item format
 */
export function productToGA4Item(
  product: {
    id: string
    nameEn: string
    nameKh?: string
    priceUsd: number
    priceKhr?: number
    categoryNameEn?: string
    categoryNameKh?: string
    sku?: string
  },
  language: "EN" | "KH" = "EN",
  currency: "USD" | "KHR" = "USD",
  quantity: number = 1,
  index?: number
): GA4ProductItem {
  return {
    item_id: product.id,
    item_name: language === "EN" ? product.nameEn : (product.nameKh || product.nameEn),
    price: currency === "USD" ? product.priceUsd : (product.priceKhr || product.priceUsd * 4100),
    quantity,
    item_category: language === "EN" ? product.categoryNameEn : product.categoryNameKh,
    item_variant: product.sku,
    index,
    currency,
  }
}
