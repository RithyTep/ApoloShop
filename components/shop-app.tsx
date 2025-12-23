"use client"

import { useState } from "react"
import { Header } from "./header"
import { ProductGrid } from "./product-grid"
import { CartDrawer } from "./cart-drawer"
import { CheckoutPage } from "./checkout-page"

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
    <div className="min-h-screen bg-background">
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
          <ProductGrid onAddToCart={addToCart} currency={currency} language={language} />
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
