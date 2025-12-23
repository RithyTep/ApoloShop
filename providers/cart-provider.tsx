"use client"

import { createContext, useContext, useReducer, useEffect, ReactNode } from "react"

export interface CartItem {
  id: string
  name: string
  nameKh: string
  price: number
  priceKhr: number
  quantity: number
  image: string
}

interface CartState {
  items: CartItem[]
  orderNote: string
}

type CartAction =
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; payload: string }
  | { type: "UPDATE_QUANTITY"; payload: { id: string; quantity: number } }
  | { type: "SET_NOTE"; payload: string }
  | { type: "CLEAR_CART" }
  | { type: "LOAD_CART"; payload: CartState }

interface CartContextType {
  items: CartItem[]
  orderNote: string
  addItem: (item: Omit<CartItem, "quantity">) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  setOrderNote: (note: string) => void
  clearCart: () => void
  totalItems: number
  subtotalUsd: number
  subtotalKhr: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = "apoloshop-cart"

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existingItem = state.items.find((item) => item.id === action.payload.id)
      if (existingItem) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        }
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }],
      }
    }
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
      }
    case "UPDATE_QUANTITY":
      if (action.payload.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((item) => item.id !== action.payload.id),
        }
      }
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
      }
    case "SET_NOTE":
      return { ...state, orderNote: action.payload }
    case "CLEAR_CART":
      return { items: [], orderNote: "" }
    case "LOAD_CART":
      return action.payload
    default:
      return state
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], orderNote: "" })

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY)
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart)
        dispatch({ type: "LOAD_CART", payload: parsed })
      } catch (e) {
        console.error("Failed to load cart from storage:", e)
      }
    }
  }, [])

  // Save cart to localStorage on change
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const addItem = (item: Omit<CartItem, "quantity">) => {
    dispatch({ type: "ADD_ITEM", payload: { ...item, quantity: 1 } })
  }

  const removeItem = (id: string) => {
    dispatch({ type: "REMOVE_ITEM", payload: id })
  }

  const updateQuantity = (id: string, quantity: number) => {
    dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity } })
  }

  const setOrderNote = (note: string) => {
    dispatch({ type: "SET_NOTE", payload: note })
  }

  const clearCart = () => {
    dispatch({ type: "CLEAR_CART" })
  }

  const totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotalUsd = state.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )
  const subtotalKhr = state.items.reduce(
    (sum, item) => sum + item.priceKhr * item.quantity,
    0
  )

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        orderNote: state.orderNote,
        addItem,
        removeItem,
        updateQuantity,
        setOrderNote,
        clearCart,
        totalItems,
        subtotalUsd,
        subtotalKhr,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
