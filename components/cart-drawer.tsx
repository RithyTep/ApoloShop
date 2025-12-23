"use client"

import { X, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CartItem } from "./shop-app"
import { Separator } from "@/components/ui/separator"

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
  items: CartItem[]
  onRemoveItem: (id: string) => void
  onUpdateQuantity: (id: string, quantity: number) => void
  onCheckout: () => void
  onClearCart: () => void
  currency: "USD" | "KHR"
  language: "EN" | "KH"
}

export function CartDrawer({
  isOpen,
  onClose,
  items,
  onRemoveItem,
  onUpdateQuantity,
  onCheckout,
  onClearCart,
  currency,
  language,
}: CartDrawerProps) {
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0)
  const total = subtotal

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-background border-l border-border z-50 flex flex-col shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">{language === "EN" ? "Shopping Cart" : "រទុកទិញ"}</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted transition-colors">
            <X size={24} className="text-foreground" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <p className="text-muted-foreground mb-4">{language === "EN" ? "Your cart is empty" : "របុករបស់អ្នកគឺទទេ"}</p>
            </div>
          ) : (
            <div className="p-4 sm:p-6 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 pb-4 border-b border-border">
                  {/* Image */}
                  <div className="w-20 h-20 bg-muted flex-shrink-0 overflow-hidden">
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-sm mb-1">{item.name}</h3>
                    <p className="text-primary font-bold mb-2">
                      {currency === "USD" ? `$${item.price}` : `${Math.round(item.price * 4000)}៛`}
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center border border-border hover:bg-muted transition-colors text-sm"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center border border-border hover:bg-muted transition-colors text-sm"
                      >
                        +
                      </button>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash size={14} />
                      <span>{language === "EN" ? "Remove" : "ដកចេញ"}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-border p-4 sm:p-6 space-y-4">
            <Separator />
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{language === "EN" ? "Subtotal" : "សរុបមូលដ្ឋាន"}</span>
                <span className="font-medium text-foreground">
                  {currency === "USD" ? `$${subtotal.toFixed(2)}` : `${Math.round(subtotal * 4000)}៛`}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span className="text-foreground">{language === "EN" ? "Total" : "សរុប"}</span>
                <span className="text-primary">
                  {currency === "USD" ? `$${total.toFixed(2)}` : `${Math.round(total * 4000)}៛`}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Button onClick={onCheckout} className="w-full bg-primary text-primary-foreground hover:bg-opacity-90">
                {language === "EN" ? "Checkout" : "ឈានទៅការចងក្រងលម្អិត"}
              </Button>
              <Button onClick={onClearCart} variant="outline" className="w-full bg-transparent">
                {language === "EN" ? "Clear Cart" : "ដកលម្អិតរទុក"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
