"use client"

import { useState, useEffect, useCallback } from "react"
import { Header } from "./header"
import { ProductGrid } from "./product-grid"
import { CartDrawer } from "./cart-drawer"
import { CheckoutPage } from "./checkout-page"
import {
  useShopCustomization,
  useClientTheme as useClientThemeQuery,
  HeroConfig,
  PromotionsConfig,
  ProductsConfig,
  FooterConfig,
  GalleryConfig,
  AboutConfig,
  TeamConfig,
} from "@/lib/api-hooks"
import { useClientThemeStyles } from "@/lib/use-client-theme"
import { HeroRenderer } from "./customizer/renderers/hero-renderer"
import { PromotionsRenderer } from "./customizer/renderers/promotions-renderer"
import { ProductsRenderer } from "./customizer/renderers/products-renderer"
import { FooterRenderer } from "./customizer/renderers/footer-renderer"
import { GalleryRenderer } from "./customizer/renderers/gallery-renderer"
import { AboutRenderer } from "./customizer/renderers/about-renderer"
import { TeamRenderer } from "./customizer/renderers/team-renderer"
import { AnnouncementBanner } from "./shop/announcement-banner"
import { PWAInstallPrompt, PWAUpdateBanner, OfflineIndicator } from "./pwa-install-prompt"
import { ChatWidget } from "./chat-widget"
import { SocialProofNotification } from "./social-proof"
import { usePWA } from "@/lib/use-pwa"
import {
  trackAddToCart,
  trackRemoveFromCart,
  trackViewCart,
  trackBeginCheckout,
  cartItemToGA4Item,
} from "@/lib/ga4"
import { type Language, detectBrowserLanguage, getTranslation, getDirection } from "@/lib/i18n"

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image: string
  inStock: boolean
}

type Page = "shop" | "checkout"

// Local storage key for language preference
const LANGUAGE_STORAGE_KEY = "apolo_language"

export function ShopApp() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState<Page>("shop")
  const [language, setLanguage] = useState<Language>("en")
  const [currency, setCurrency] = useState<"USD" | "KHR">("USD")
  const [hasDetectedLanguage, setHasDetectedLanguage] = useState(false)

  // Auto-detect browser language on initial load
  useEffect(() => {
    if (hasDetectedLanguage) return

    // Check for stored preference first
    const storedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null
    if (storedLang && ["en", "kh", "th", "vi", "zh"].includes(storedLang)) {
      setLanguage(storedLang)
    } else {
      // Auto-detect from browser
      const detectedLang = detectBrowserLanguage()
      setLanguage(detectedLang)
    }
    setHasDetectedLanguage(true)
  }, [hasDetectedLanguage])

  // Persist language preference
  const handleLanguageChange = useCallback((newLang: Language) => {
    setLanguage(newLang)
    localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang)
    // Update document direction for RTL support
    document.documentElement.dir = getDirection(newLang)
    document.documentElement.lang = newLang
  }, [])

  // Load shop customization
  const { data: customization } = useShopCustomization()
  const config = customization?.config
  const sections = config?.sections?.filter((s) => s.enabled).sort((a, b) => a.order - b.order) || []

  // Load and apply client-specific theme (multi-tenant whitelabel)
  const { data: clientThemeData } = useClientThemeQuery()
  useClientThemeStyles(clientThemeData?.theme)

  // PWA integration - register service worker and cache products
  const { cacheProducts, isServiceWorkerReady } = usePWA()

  // Cache products when they're loaded and SW is ready
  useEffect(() => {
    if (isServiceWorkerReady && sections.length > 0) {
      // Find products from the products section config
      const productSection = sections.find(s => s.type === "products")
      if (productSection?.config) {
        const productsConfig = productSection.config as ProductsConfig
        if (productsConfig.products) {
          cacheProducts(productsConfig.products.map(p => ({
            id: p.id,
            nameEn: p.nameEn || "",
            nameKh: p.nameKh || "",
            priceUsd: Number(p.priceUsd),
            priceKhr: Number(p.priceKhr),
            imageUrl: p.imageUrl,
          })))
        }
      }
    }
  }, [isServiceWorkerReady, sections, cacheProducts])

  // Track GA4 view_cart event when cart drawer opens
  useEffect(() => {
    if (isCartOpen && cart.length > 0) {
      trackViewCart(
        cart.map((item) => cartItemToGA4Item({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        currency
      )
    }
  }, [isCartOpen]) // Only track when cart opens, not on cart content changes

  const addToCart = useCallback((id: string, name: string, price: number, image: string) => {
    // Track GA4 add_to_cart event
    trackAddToCart(
      cartItemToGA4Item({ id, name, price, quantity: 1 }),
      currency
    )

    setCart((prev) => {
      const existing = prev.find((item) => item.id === id)
      if (existing) {
        return prev.map((item) => (item.id === id ? { ...item, quantity: item.quantity + 1 } : item))
      }
      return [...prev, { id, name, price, quantity: 1, image, inStock: true }]
    })
  }, [currency])

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => {
      // Find the item to track its removal
      const item = prev.find((i) => i.id === id)
      if (item) {
        // Track GA4 remove_from_cart event
        trackRemoveFromCart(
          cartItemToGA4Item({ id: item.id, name: item.name, price: item.price, quantity: item.quantity }),
          currency
        )
      }
      return prev.filter((item) => item.id !== id)
    })
  }, [currency])

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id)
    } else {
      setCart((prev) => prev.map((item) => (item.id === id ? { ...item, quantity } : item)))
    }
  }

  const clearCart = () => {
    setCart([])
  }

  // Build custom theme styles (shop customization overrides client theme)
  // Client theme provides base branding, shop customization allows further tweaks
  const clientTheme = clientThemeData?.theme
  const themeStyles = config?.theme
    ? {
        // Use client theme as base, allow shop customization to override
        "--primary": config.theme.primaryColor || clientTheme?.primaryColor,
        "--accent": config.theme.accentColor || clientTheme?.secondaryColor,
        "--background": config.theme.backgroundColor,
        "--foreground": config.theme.textColor,
        "--radius": `${config.theme.borderRadius}px`,
      }
    : clientTheme
    ? {
        // Fallback to client theme only if no shop customization
        "--primary": clientTheme.primaryColor,
        "--accent": clientTheme.secondaryColor,
      }
    : {}

  // Determine logo: shop customization > client theme > default
  const effectiveLogoUrl = config?.theme?.logoUrl || clientTheme?.logoUrl

  return (
    <div
      className="min-h-screen bg-background max-w-[1280px] mx-auto"
      style={themeStyles as React.CSSProperties}
    >
      {/* Skip to main content link - WCAG 2.4.1 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        {getTranslation(language).accessibility.skipToContent}
      </a>

      {/* Announcement Banner */}
      {config?.announcement && (
        <AnnouncementBanner
          config={config.announcement}
          language={language}
          currentPage={currentPage === "shop" ? "home" : "checkout"}
        />
      )}

      <Header
        cartCount={cart.length}
        onCartClick={() => setIsCartOpen(true)}
        language={language}
        onLanguageChange={handleLanguageChange}
        showAllLanguages={true} // Enable multi-language dropdown
        currency={currency}
        onCurrencyChange={setCurrency}
        shopName={config?.theme?.shopName || clientThemeData?.client?.name}
        logoUrl={effectiveLogoUrl}
        primaryColor={config?.theme?.primaryColor || clientTheme?.primaryColor}
        searchBranding={config?.theme ? {
          primaryColor: config.theme.primaryColor || clientTheme?.primaryColor,
          accentColor: config.theme.accentColor || clientTheme?.secondaryColor,
          borderRadius: config.theme.borderRadius,
        } : clientTheme ? {
          primaryColor: clientTheme.primaryColor || undefined,
          accentColor: clientTheme.secondaryColor || undefined,
        } : undefined}
      />

      {currentPage === "shop" ? (
        <main id="main-content" className="pt-20" role="main" aria-label={getTranslation(language).accessibility.productListing}>
          {/* Render customized sections */}
          {sections.length > 0 ? (
            sections.map((section) => {
              switch (section.type) {
                case "hero":
                  return (
                    <HeroRenderer
                      key={section.id}
                      config={section.config as HeroConfig}
                      language={language}
                    />
                  )
                case "promotions":
                  return (
                    <PromotionsRenderer
                      key={section.id}
                      config={section.config as PromotionsConfig}
                      language={language}
                    />
                  )
                case "products":
                  return (
                    <ProductsRenderer
                      key={section.id}
                      config={section.config as ProductsConfig}
                      language={language}
                      currency={currency}
                      onAddToCart={addToCart}
                    />
                  )
                case "footer":
                  return (
                    <FooterRenderer
                      key={section.id}
                      config={section.config as FooterConfig}
                      language={language}
                    />
                  )
                case "gallery":
                  return (
                    <GalleryRenderer
                      key={section.id}
                      config={section.config as GalleryConfig}
                      language={language}
                    />
                  )
                case "about":
                  return (
                    <AboutRenderer
                      key={section.id}
                      config={section.config as AboutConfig}
                      language={language}
                    />
                  )
                case "team":
                  return (
                    <TeamRenderer
                      key={section.id}
                      config={section.config as TeamConfig}
                      language={language}
                    />
                  )
                default:
                  return null
              }
            })
          ) : (
            // Fallback to default product grid if no customization
            <ProductGrid onAddToCart={addToCart} currency={currency} language={language} />
          )}
        </main>
      ) : (
        <CheckoutPage
          cart={cart}
          currency={currency}
          language={language}
          onBackToShop={() => setCurrentPage("shop")}
          onOrderComplete={clearCart}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeFromCart}
        />
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onRemoveItem={removeFromCart}
        onUpdateQuantity={updateQuantity}
        onCheckout={() => {
          // Track GA4 begin_checkout event
          trackBeginCheckout(
            cart.map((item) => cartItemToGA4Item({
              id: item.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
            })),
            currency
          )
          setIsCartOpen(false)
          setCurrentPage("checkout")
        }}
        onClearCart={clearCart}
        currency={currency}
        language={language}
      />

      {/* Social Proof Notifications */}
      <SocialProofNotification language={language === "en" ? "EN" : "KH"} />

      {/* PWA Components */}
      <PWAInstallPrompt language={language} />
      <PWAUpdateBanner language={language} />
      <OfflineIndicator language={language} />

      {/* Live Chat Widget */}
      <ChatWidget language={language} />
    </div>
  )
}
