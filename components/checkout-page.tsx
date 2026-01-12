"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import type { CartItem } from "@/lib/shop-context"
import {
  MessageCircle,
  Send,
  CheckCircle,
  Loader2,
  CreditCard,
  Smartphone,
  QrCode,
  Banknote,
} from "lucide-react"
import { useCreateOrder, type OrderChannel } from "@/lib/api-hooks"
import { translations } from "@/lib/i18n"
import type { PaymentGatewayType, PaymentInitResponse } from "@/lib/payment-gateways"

interface CheckoutPageProps {
  cart: CartItem[]
  currency: "USD" | "KHR"
  language: "EN" | "KH"
  onBackToShop: () => void
  onOrderComplete?: () => void
}

// Payment method icons mapping
const PAYMENT_ICONS: Record<PaymentGatewayType, typeof CreditCard> = {
  CASH: Banknote,
  ABA_PAYWAY: CreditCard,
  WING: Smartphone,
  KHQR: QrCode,
}

export function CheckoutPage({ cart, currency, language, onBackToShop, onOrderComplete }: CheckoutPageProps) {
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [deliveryNote, setDeliveryNote] = useState("")
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [orderNumber, setOrderNumber] = useState("")

  // Payment state
  const [selectedPayment, setSelectedPayment] = useState<PaymentGatewayType>("CASH")
  const [paymentStep, setPaymentStep] = useState<"select" | "processing" | "qr" | "success" | "failed">("select")
  const [paymentResponse, setPaymentResponse] = useState<PaymentInitResponse | null>(null)
  const [qrCountdown, setQrCountdown] = useState(0)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null)

  const createOrder = useCreateOrder()
  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0)
  const t = translations[language === "EN" ? "en" : "kh"]

  // QR countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (paymentStep === "qr" && qrCountdown > 0) {
      interval = setInterval(() => {
        setQrCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [paymentStep, qrCountdown])

  const handleCreateOrderAndPay = async () => {
    // First create the order
    setPaymentStep("processing")
    setIsProcessingPayment(true)

    try {
      const order = await createOrder.mutateAsync({
        customerName: fullName,
        customerPhone: phone,
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
        channel: "WEBSITE" as OrderChannel,
        currency,
        note: deliveryNote || undefined,
      })

      setCurrentOrderId(order.id)
      setOrderNumber(order.orderNumber)

      // Now initiate payment
      const paymentAmount = currency === "USD" ? total : Math.round(total * 4000)

      const response = await fetch("/api/payments/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          gateway: selectedPayment,
          amount: paymentAmount,
          currency,
          customerPhone: phone,
          customerName: fullName,
          returnUrl: `${window.location.origin}/checkout/callback`,
        }),
      })

      const paymentData: PaymentInitResponse = await response.json()

      if (!paymentData.success) {
        throw new Error(paymentData.message || "Payment initialization failed")
      }

      setPaymentResponse(paymentData)

      // Handle different payment flows
      if (selectedPayment === "CASH") {
        // COD - Order confirmed, show success
        setPaymentStep("success")
        setOrderSuccess(true)
        onOrderComplete?.()
      } else if (paymentData.redirectUrl) {
        // Redirect-based payment (ABA PayWay, Wing)
        window.location.href = paymentData.redirectUrl
      } else if (paymentData.qrImage) {
        // QR-based payment (KHQR)
        setPaymentStep("qr")
        setQrCountdown(15 * 60) // 15 minutes
      }
    } catch (error) {
      console.error("Payment error:", error)
      setPaymentStep("failed")
    } finally {
      setIsProcessingPayment(false)
    }
  }

  const handleOrderVia = async (method: "telegram" | "messenger") => {
    const channel: OrderChannel = method === "telegram" ? "TELEGRAM" : "MESSENGER"

    try {
      const order = await createOrder.mutateAsync({
        customerName: fullName,
        customerPhone: phone,
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
        channel,
        currency,
        note: deliveryNote || undefined,
      })

      setOrderNumber(order.orderNumber)
      setOrderSuccess(true)

      const orderSummary = cart.map((item) => `${item.name} x${item.quantity}`).join("\n")
      const message = `Order #${order.orderNumber} from ApoloShop:\n\nName: ${fullName}\nPhone: ${phone}\n\n${orderSummary}\n\nTotal: ${
        currency === "USD" ? `$${total.toFixed(2)}` : `${Math.round(total * 4000)}៛`
      }\n\nDelivery Note: ${deliveryNote}`

      if (method === "telegram") {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(message)}`, "_blank")
      } else {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("apoloshop.com")}&quote=${encodeURIComponent(message)}`,
          "_blank",
        )
      }

      onOrderComplete?.()
    } catch {
      // Error is handled by the mutation state
    }
  }

  const handleRetryPayment = () => {
    setPaymentStep("select")
    setPaymentResponse(null)
  }

  // Success screen
  if (orderSuccess) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-16">
          <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-4">
            {language === "EN" ? "Order Placed Successfully!" : "បញ្ជាទិញបានជោគជ័យ!"}
          </h1>
          <p className="text-lg text-muted-foreground mb-2">
            {language === "EN" ? "Your order number is:" : "លេខបញ្ជាទិញរបស់អ្នក:"}
          </p>
          <p className="text-2xl font-bold text-primary mb-4">{orderNumber}</p>

          {selectedPayment === "CASH" && (
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              {t.payment.codInstructions}
            </p>
          )}

          <p className="text-muted-foreground mb-8">
            {language === "EN"
              ? "We'll contact you shortly to confirm your order."
              : "យើងនឹងទាក់ទងអ្នកក្នុងពេលឆាប់ៗដើម្បីបញ្ជាក់ការបញ្ជាទិញរបស់អ្នក។"}
          </p>
          <Button onClick={onBackToShop} className="bg-primary text-primary-foreground">
            {language === "EN" ? "Continue Shopping" : "បន្តទិញទំនិញ"}
          </Button>
        </div>
      </main>
    )
  }

  // QR Code payment screen
  if (paymentStep === "qr" && paymentResponse?.qrImage) {
    const minutes = Math.floor(qrCountdown / 60)
    const seconds = qrCountdown % 60

    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Button onClick={handleRetryPayment} variant="outline" className="mb-8 bg-transparent">
          ← {t.payment.changeMethod}
        </Button>

        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-foreground mb-4">{t.payment.scanQR}</h1>

          <div className="bg-white p-6 rounded-lg shadow-lg inline-block mb-6">
            <img
              src={paymentResponse.qrImage}
              alt="KHQR Payment Code"
              className="w-64 h-64 mx-auto"
            />
          </div>

          <div className="mb-6">
            <p className="text-lg font-bold text-primary mb-2">
              {t.payment.totalToPay}:{" "}
              {paymentResponse.currency === "USD"
                ? `$${paymentResponse.amount.toFixed(2)}`
                : `${Math.round(paymentResponse.amount)}៛`}
            </p>
            <p className="text-muted-foreground">
              {language === "EN" ? "Order #" : "ការបញ្ជាទិញ #"}{orderNumber}
            </p>
          </div>

          {qrCountdown > 0 ? (
            <p className="text-sm text-muted-foreground mb-6">
              {t.payment.qrExpires} {minutes}:{seconds.toString().padStart(2, "0")} {t.payment.minutes}
            </p>
          ) : (
            <div className="mb-6">
              <p className="text-destructive mb-4">
                {language === "EN" ? "QR code expired" : "QR កូដផុតកំណត់"}
              </p>
              <Button onClick={handleCreateOrderAndPay} className="bg-primary text-primary-foreground">
                {t.payment.generateQR}
              </Button>
            </div>
          )}

          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => {
                // Poll for payment status
                if (paymentResponse.paymentId) {
                  fetch("/api/payments/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ paymentId: paymentResponse.paymentId }),
                  })
                    .then((res) => res.json())
                    .then((data) => {
                      if (data.status === "COMPLETED") {
                        setPaymentStep("success")
                        setOrderSuccess(true)
                        onOrderComplete?.()
                      }
                    })
                }
              }}
              variant="outline"
              className="bg-transparent"
            >
              {t.payment.verifying}
            </Button>
          </div>
        </div>
      </main>
    )
  }

  // Payment failed screen
  if (paymentStep === "failed") {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-16">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
            <span className="text-3xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">{t.payment.failed}</h1>
          <div className="flex gap-4 justify-center">
            <Button onClick={handleRetryPayment} className="bg-primary text-primary-foreground">
              {t.payment.retryPayment}
            </Button>
            <Button onClick={onBackToShop} variant="outline" className="bg-transparent">
              {language === "EN" ? "Back to Shop" : "ត្រលប់ទៅហាង"}
            </Button>
          </div>
        </div>
      </main>
    )
  }

  // Main checkout form
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

            {/* Payment Method Selection */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">{t.payment.selectMethod}</h2>

              <RadioGroup
                value={selectedPayment}
                onValueChange={(value) => setSelectedPayment(value as PaymentGatewayType)}
                className="space-y-3"
              >
                {/* Cash on Delivery */}
                <div className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="CASH" id="payment-cash" />
                  <Label htmlFor="payment-cash" className="flex items-center gap-3 cursor-pointer flex-1">
                    <Banknote className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{t.payment.methods.cash}</p>
                      <p className="text-sm text-muted-foreground">{t.payment.descriptions.cash}</p>
                    </div>
                  </Label>
                </div>

                {/* ABA PayWay */}
                <div className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="ABA_PAYWAY" id="payment-aba" />
                  <Label htmlFor="payment-aba" className="flex items-center gap-3 cursor-pointer flex-1">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{t.payment.methods.abaPayway}</p>
                      <p className="text-sm text-muted-foreground">{t.payment.descriptions.abaPayway}</p>
                    </div>
                  </Label>
                </div>

                {/* Wing */}
                <div className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="WING" id="payment-wing" />
                  <Label htmlFor="payment-wing" className="flex items-center gap-3 cursor-pointer flex-1">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{t.payment.methods.wing}</p>
                      <p className="text-sm text-muted-foreground">{t.payment.descriptions.wing}</p>
                    </div>
                  </Label>
                </div>

                {/* KHQR */}
                <div className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="KHQR" id="payment-khqr" />
                  <Label htmlFor="payment-khqr" className="flex items-center gap-3 cursor-pointer flex-1">
                    <QrCode className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{t.payment.methods.khqr}</p>
                      <p className="text-sm text-muted-foreground">{t.payment.descriptions.khqr}</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              {createOrder.error && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                  {language === "EN" ? "Failed to place order. Please try again." : "មិនអាចបញ្ជាទិញបានទេ។ សូមព្យាយាមម្តងទៀត។"}
                </div>
              )}

              {/* Pay Now Button */}
              <Button
                onClick={handleCreateOrderAndPay}
                disabled={!fullName || !phone || isProcessingPayment || createOrder.isPending}
                className="w-full bg-primary text-primary-foreground hover:bg-opacity-90 disabled:opacity-50 h-12 text-lg"
              >
                {isProcessingPayment || createOrder.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {t.payment.processing}
                  </>
                ) : (
                  <>
                    {(() => {
                      const Icon = PAYMENT_ICONS[selectedPayment]
                      return <Icon className="mr-2 h-5 w-5" />
                    })()}
                    {t.payment.payNow}
                  </>
                )}
              </Button>
            </div>

            <Separator />

            {/* Alternative: Order via Messaging */}
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                {language === "EN" ? "Or order via messaging apps" : "ឬបញ្ជាទិញតាមកម្មវិធីផ្ញើសារ"}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleOrderVia("telegram")}
                  disabled={!fullName || !phone || createOrder.isPending}
                  variant="outline"
                  className="bg-transparent flex items-center justify-center gap-2"
                >
                  <MessageCircle size={18} />
                  Telegram
                </Button>

                <Button
                  onClick={() => handleOrderVia("messenger")}
                  disabled={!fullName || !phone || createOrder.isPending}
                  variant="outline"
                  className="bg-transparent flex items-center justify-center gap-2"
                >
                  <Send size={18} />
                  Messenger
                </Button>
              </div>
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
