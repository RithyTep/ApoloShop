"use client"

import { useState } from "react"
import { Header } from "./header"
import { ProductGrid } from "./product-grid"
import { CartDrawer } from "./cart-drawer"
import { CheckoutPage } from "./checkout-page"
import {
  useShopCustomization,
  HeroConfig,
  PromotionsConfig,
  ProductsConfig,
  FooterConfig,
} from "@/lib/api-hooks"
import { HeroRenderer } from "./customizer/renderers/hero-renderer"
import { PromotionsRenderer } from "./customizer/renderers/promotions-renderer"
import { ProductsRenderer } from "./customizer/renderers/products-renderer"
import { FooterRenderer } from "./customizer/renderers/footer-renderer"

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image: string
  inStock: boolean
}

type Page = "shop" | "checkout"

export function ShopApp() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState<Page>("shop")
  const [language, setLanguage] = useState<"EN" | "KH">("EN")
  const [currency, setCurrency] = useState<"USD" | "KHR">("USD")

  // Load shop customization
  const { data: customization } = useShopCustomization()
  const config = customization?.config
  const sections = config?.sections?.filter((s) => s.enabled).sort((a, b) => a.order - b.order) || []

  const addToCart = (id: string, name: string, price: number, image: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === id)
      if (existing) {
        return prev.map((item) => (item.id === id ? { ...item, quantity: item.quantity + 1 } : item))
      }
      return [...prev, { id, name, price, quantity: 1, image, inStock: true }]
    })
  }

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id))
  }

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

  return (
    <div className="min-h-screen bg-background max-w-[1280px] mx-auto">
      <Header
        cartCount={cart.length}
        onCartClick={() => setIsCartOpen(true)}
        language={language}
        onLanguageChange={setLanguage}
        currency={currency}
        onCurrencyChange={setCurrency}
      />

      {currentPage === "shop" ? (
        <main className="pt-20">
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
        />
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onRemoveItem={removeFromCart}
        onUpdateQuantity={updateQuantity}
        onCheckout={() => {
          setIsCartOpen(false)
          setCurrentPage("checkout")
        }}
        onClearCart={clearCart}
        currency={currency}
        language={language}
      />
    </div>
  )
}
