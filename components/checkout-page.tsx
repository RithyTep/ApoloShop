"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import type { CartItem } from "./shop-app"
import { MessageCircle, Envelope } from "phosphor-react"

interface CheckoutPageProps {
  cart: CartItem[]
  currency: "USD" | "KHR"
  language: "EN" | "KH"
  onBackToShop: () => void
}

export function CheckoutPage({ cart, currency, language, onBackToShop }: CheckoutPageProps) {
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [deliveryNote, setDeliveryNote] = useState("")

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0)

  const handleOrderVia = (method: "telegram" | "messenger") => {
    const orderSummary = cart.map((item) => `${item.name} x${item.quantity}`).join("\n")

    const message = `Order from Simple Shop:\n\nName: ${fullName}\nPhone: ${phone}\n\n${orderSummary}\n\nTotal: ${
      currency === "USD" ? `$${total.toFixed(2)}` : `${Math.round(total * 4000)}៛`
    }\n\nDelivery Note: ${deliveryNote}`

    if (method === "telegram") {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(message)}`, "_blank")
    } else {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("simpleshop.com")}&quote=${encodeURIComponent(message)}`,
        "_blank",
      )
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Button onClick={onBackToShop} variant="outline" className="mb-8 bg-transparent">
        {language === "EN" ? "← Back to Shop" : "← ត្រលប់ទៅហាង"}
      </Button>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Form */}
        <div className="md:col-span-2">
          <h1 className="text-3xl font-bold text-foreground mb-8">{language === "EN" ? "Checkout" : "ឈានទៅការលម្អិត"}</h1>

          <div className="space-y-6">
            {/* Contact Info */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                {language === "EN" ? "Contact Information" : "ព័ត៌មានលម្អិត"}
              </h2>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {language === "EN" ? "Full Name" : "ឈ្មោះពេញលេញ"}
                </label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={language === "EN" ? "Enter your name" : "បញ្ចូលឈ្មោះរបស់អ្នក"}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {language === "EN" ? "Phone Number" : "លេខទូរស័ព្ទ"}
                </label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={language === "EN" ? "+855 ..." : "+855 ..."}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {language === "EN" ? "Delivery Note (Optional)" : "ចំណាំការដឹក (ស្ម័គ្រចិត្ត)"}
                </label>
                <textarea
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder={language === "EN" ? "Add any delivery instructions..." : "បន្ថែមការណែនាំលម្អិត..."}
                  rows={4}
                  className="w-full px-3 py-2 border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <Separator />

            {/* Payment Methods */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                {language === "EN" ? "Complete Your Order" : "បញ្ចប់ការបញ្ជាទិញរបស់អ្នក"}
              </h2>

              <div className="space-y-3">
                <Button
                  onClick={() => handleOrderVia("telegram")}
                  disabled={!fullName || !phone}
                  className="w-full bg-primary text-primary-foreground hover:bg-opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <MessageCircle size={20} />
                  {language === "EN" ? "Order via Telegram" : "បញ្ជាទិញតាម Telegram"}
                </Button>

                <Button
                  onClick={() => handleOrderVia("messenger")}
                  disabled={!fullName || !phone}
                  className="w-full bg-primary text-primary-foreground hover:bg-opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Envelope size={20} />
                  {language === "EN" ? "Order via Facebook Messenger" : "បញ្ជាទិញតាម Facebook Messenger"}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                {language === "EN" ? "Your order details will be shared with our team" : "សមាសភាគលម្អិតលម្អិតនឹងត្រូវចែករំលែក"}
              </p>
            </div>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="md:col-span-1">
          <div className="bg-muted p-6 border border-border sticky top-24">
            <h3 className="text-lg font-bold text-foreground mb-4">
              {language === "EN" ? "Order Summary" : "សង្ខេបលម្អិត"}
            </h3>

            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                  </div>
                  <p className="font-medium text-foreground">
                    {currency === "USD"
                      ? `$${(item.price * item.quantity).toFixed(2)}`
                      : `${Math.round(item.price * item.quantity * 4000)}៛`}
                  </p>
                </div>
              ))}
            </div>

            <Separator className="mb-4" />

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{language === "EN" ? "Subtotal" : "សរុបមូលដ្ឋាន"}</span>
                <span className="text-foreground font-medium">
                  {currency === "USD" ? `$${total.toFixed(2)}` : `${Math.round(total * 4000)}៛`}
                </span>
              </div>

              <div className="flex justify-between text-lg font-bold">
                <span className="text-foreground">{language === "EN" ? "Total" : "សរុប"}</span>
                <span className="text-primary">
                  {currency === "USD" ? `$${total.toFixed(2)}` : `${Math.round(total * 4000)}៛`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
