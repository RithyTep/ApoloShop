"use client"

import { createContext, useContext } from "react"

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image: string
  inStock: boolean
}

export interface CartContextType {
  cart: CartItem[]
  addToCart: (id: string, name: string, price: number, image: string) => void
  removeFromCart: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
}

export interface LanguageContextType {
  language: "EN" | "KH"
  setLanguage: (lang: "EN" | "KH") => void
}

export interface CurrencyContextType {
  currency: "USD" | "KHR"
  setCurrency: (curr: "USD" | "KHR") => void
}

// Create contexts with default values
export const CartContext = createContext<CartContextType>({
  cart: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
})

export const LanguageContext = createContext<LanguageContextType>({
  language: "EN",
  setLanguage: () => {},
})

export const CurrencyContext = createContext<CurrencyContextType>({
  currency: "USD",
  setCurrency: () => {},
})

// Custom hooks for consuming contexts
export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider")
  }
  return context
}
