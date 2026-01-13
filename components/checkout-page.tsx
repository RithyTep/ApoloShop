"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
  MapPin,
  Plus,
  Minus,
  Trash2,
  ChevronRight,
  Home,
  Building,
  Check,
} from "lucide-react"
import { useCreateOrder, type OrderChannel } from "@/lib/api-hooks"
import { translations } from "@/lib/i18n"
import type { PaymentGatewayType, PaymentInitResponse } from "@/lib/payment-gateways"
import { CouponInput } from "@/components/coupon-input"
import { TrustStrip } from "@/components/social-proof"

interface ShippingAddress {
  id: string
  label: string | null
  fullName: string
  phone: string
  province: string | null
  district: string | null
  commune: string | null
  addressLine: string
  landmark: string | null
  isDefault: boolean
}

interface CheckoutPageProps {
  cart: CartItem[]
  currency: string // Supports all Currency enum values
  language: "EN" | "KH"
  onBackToShop: () => void
  onOrderComplete?: () => void
  onUpdateQuantity?: (id: string, quantity: number) => void
  onRemoveItem?: (id: string) => void
  baseCurrency?: string // Shop's settlement currency (default USD)
  conversionFeePercent?: number // Conversion fee percentage (e.g., 0.02 = 2%)
  showConversionInfo?: boolean // Show exchange rate and fee info
}

// Payment method icons mapping
const PAYMENT_ICONS: Record<PaymentGatewayType, typeof CreditCard> = {
  CASH: Banknote,
  ABA_PAYWAY: CreditCard,
  WING: Smartphone,
  KHQR: QrCode,
}

// Guest ID storage key
const GUEST_ID_KEY = "apoloshop-guest-id"

function getOrCreateGuestId(): string {
  if (typeof window === "undefined") return ""
  let guestId = localStorage.getItem(GUEST_ID_KEY)
  if (!guestId) {
    guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    localStorage.setItem(GUEST_ID_KEY, guestId)
  }
  return guestId
}

export function CheckoutPage({
  cart,
  currency,
  language,
  onBackToShop,
  onOrderComplete,
  onUpdateQuantity,
  onRemoveItem,
  baseCurrency = "USD",
  conversionFeePercent = 0,
  showConversionInfo = false,
}: CheckoutPageProps) {
  // Contact info state
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [deliveryNote, setDeliveryNote] = useState("")

  // Address state
  const [savedAddresses, setSavedAddresses] = useState<ShippingAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [showNewAddressForm, setShowNewAddressForm] = useState(false)
  const [addressChecked, setAddressChecked] = useState(false)
  const [isCheckingAddresses, setIsCheckingAddresses] = useState(false)

  // New address form state
  const [newAddress, setNewAddress] = useState({
    label: "",
    province: "",
    district: "",
    commune: "",
    addressLine: "",
    landmark: "",
  })
  const [saveAddressForFuture, setSaveAddressForFuture] = useState(true)

  // Order state
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [orderNumber, setOrderNumber] = useState("")

  // Payment state
  const [selectedPayment, setSelectedPayment] = useState<PaymentGatewayType>("CASH")
  const [paymentStep, setPaymentStep] = useState<"select" | "processing" | "qr" | "success" | "failed">("select")
  const [paymentResponse, setPaymentResponse] = useState<PaymentInitResponse | null>(null)
  const [qrCountdown, setQrCountdown] = useState(0)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // Coupon state
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string
    code: string
    type: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING" | "BOGO"
    description: string
  } | null>(null)
  const [couponDiscount, setCouponDiscount] = useState<{
    usd: number
    khr: number
    description: string
  } | null>(null)

  const createOrder = useCreateOrder()
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0)
  const discountAmount = couponDiscount?.usd || 0
  const finalTotal = Math.max(0, subtotal - discountAmount)
  const t = translations[language === "EN" ? "en" : "kh"]
  const tc = t.checkout
  const tCurrency = t.currency

  // Currency conversion state
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [rateSource, setRateSource] = useState<string>("default")

  // Fetch exchange rate when currency differs from base
  useEffect(() => {
    if (currency !== baseCurrency && showConversionInfo) {
      fetch(`/api/currency?action=rate&from=${baseCurrency}&to=${currency}`)
        .then(res => res.json())
        .then(data => {
          setExchangeRate(data.rate)
          setRateSource(data.source)
        })
        .catch(() => {})
    }
  }, [currency, baseCurrency, showConversionInfo])

  // Calculate conversion fee
  const conversionFeeAmount = currency !== baseCurrency && conversionFeePercent > 0
    ? finalTotal * conversionFeePercent
    : 0
  const totalWithFee = finalTotal + conversionFeeAmount

  // Check for saved addresses when phone number is entered
  const checkSavedAddresses = useCallback(async () => {
    if (!phone || phone.length < 8) return

    setIsCheckingAddresses(true)
    try {
      const response = await fetch(`/api/shipping-addresses?phone=${encodeURIComponent(phone)}`)
      if (response.ok) {
        const data = await response.json()
        setSavedAddresses(data.addresses || [])
        setAddressChecked(true)

        // Auto-select default address if available
        const defaultAddr = data.addresses?.find((a: ShippingAddress) => a.isDefault)
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id)
          setFullName(defaultAddr.fullName)
        }
      }
    } catch (error) {
      console.error("Error checking addresses:", error)
    } finally {
      setIsCheckingAddresses(false)
    }
  }, [phone])

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

  // Get selected address details
  const selectedAddress = savedAddresses.find((a) => a.id === selectedAddressId)

  // Build full delivery address string
  const getDeliveryAddressString = (): string => {
    if (selectedAddress) {
      const parts = [
        selectedAddress.addressLine,
        selectedAddress.commune,
        selectedAddress.district,
        selectedAddress.province,
      ].filter(Boolean)
      if (selectedAddress.landmark) {
        parts.push(`(${selectedAddress.landmark})`)
      }
      return parts.join(", ")
    }
    if (showNewAddressForm && newAddress.addressLine) {
      const parts = [
        newAddress.addressLine,
        newAddress.commune,
        newAddress.district,
        newAddress.province,
      ].filter(Boolean)
      if (newAddress.landmark) {
        parts.push(`(${newAddress.landmark})`)
      }
      return parts.join(", ")
    }
    return ""
  }

  // Save new address
  const saveNewAddress = async () => {
    if (!newAddress.addressLine || !fullName || !phone) return

    const guestId = getOrCreateGuestId()

    try {
      const response = await fetch("/api/shipping-addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId,
          fullName,
          phone,
          label: newAddress.label || null,
          province: newAddress.province || null,
          district: newAddress.district || null,
          commune: newAddress.commune || null,
          addressLine: newAddress.addressLine,
          landmark: newAddress.landmark || null,
          isDefault: savedAddresses.length === 0,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSavedAddresses((prev) => [...prev, data.address])
        setSelectedAddressId(data.address.id)
        setShowNewAddressForm(false)
      }
    } catch (error) {
      console.error("Error saving address:", error)
    }
  }

  const handleCreateOrderAndPay = async () => {
    setPaymentStep("processing")
    setIsProcessingPayment(true)

    // Save address if requested
    if (saveAddressForFuture && showNewAddressForm && newAddress.addressLine) {
      await saveNewAddress()
    }

    const deliveryAddress = getDeliveryAddressString()
    const orderNote = [deliveryAddress, deliveryNote].filter(Boolean).join("\n\n")

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
        note: orderNote || undefined,
      })

      setOrderNumber(order.orderNumber)

      // Record coupon usage if applied
      if (appliedCoupon && couponDiscount) {
        try {
          await fetch("/api/coupons/use", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              couponId: appliedCoupon.id,
              orderId: order.id,
              discountUsd: couponDiscount.usd,
              guestId: getOrCreateGuestId(),
            }),
          })
        } catch (err) {
          console.error("Failed to record coupon usage:", err)
          // Non-blocking - order still proceeds
        }
      }

      // Initiate payment
      const paymentAmount = currency === "USD" ? finalTotal : Math.round(finalTotal * 4000)

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
        setPaymentStep("success")
        setOrderSuccess(true)
        onOrderComplete?.()
      } else if (paymentData.redirectUrl) {
        window.location.href = paymentData.redirectUrl
      } else if (paymentData.qrImage) {
        setPaymentStep("qr")
        setQrCountdown(15 * 60)
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
    const deliveryAddress = getDeliveryAddressString()
    const orderNote = [deliveryAddress, deliveryNote].filter(Boolean).join("\n\n")

    // Save address if requested
    if (saveAddressForFuture && showNewAddressForm && newAddress.addressLine) {
      await saveNewAddress()
    }

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
        note: orderNote || undefined,
      })

      setOrderNumber(order.orderNumber)
      setOrderSuccess(true)

      const orderSummary = cart.map((item) => `${item.name} x${item.quantity}`).join("\n")
      const discountLine = couponDiscount ? `\nDiscount (${appliedCoupon?.code}): -${currency === "USD" ? `$${couponDiscount.usd.toFixed(2)}` : `${couponDiscount.khr}៛`}` : ""
      const message = `Order #${order.orderNumber} from ApoloShop:\n\nName: ${fullName}\nPhone: ${phone}\n${deliveryAddress ? `\nAddress: ${deliveryAddress}` : ""}\n\n${orderSummary}${discountLine}\n\nTotal: ${
        currency === "USD" ? `$${finalTotal.toFixed(2)}` : `${Math.round(finalTotal * 4000)}៛`
      }${deliveryNote ? `\n\nNote: ${deliveryNote}` : ""}`

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

  // Currency info for formatting
  const currencySymbols: Record<string, { symbol: string; position: "before" | "after"; decimals: number }> = {
    USD: { symbol: "$", position: "before", decimals: 2 },
    KHR: { symbol: "៛", position: "after", decimals: 0 },
    THB: { symbol: "฿", position: "before", decimals: 2 },
    VND: { symbol: "₫", position: "after", decimals: 0 },
    SGD: { symbol: "S$", position: "before", decimals: 2 },
    MYR: { symbol: "RM", position: "before", decimals: 2 },
    EUR: { symbol: "€", position: "before", decimals: 2 },
    GBP: { symbol: "£", position: "before", decimals: 2 },
  }

  // Default exchange rates (1 USD = X) for fallback
  const defaultRates: Record<string, number> = {
    USD: 1, KHR: 4000, THB: 35, VND: 24500, SGD: 1.35, MYR: 4.7, EUR: 0.92, GBP: 0.79
  }

  // Format price for display in selected currency
  const formatPrice = (priceInBase: number) => {
    // Convert from base currency if needed
    const rate = exchangeRate || defaultRates[currency] || 1
    const converted = currency === baseCurrency ? priceInBase : priceInBase * rate

    const info = currencySymbols[currency] || { symbol: currency, position: "before", decimals: 2 }
    const formatted = info.decimals === 0
      ? Math.round(converted).toLocaleString()
      : converted.toLocaleString(undefined, { minimumFractionDigits: info.decimals, maximumFractionDigits: info.decimals })

    return info.position === "before"
      ? `${info.symbol}${formatted}`
      : `${formatted}${info.symbol}`
  }

  // Format price in base currency (for settlement display)
  const formatBaseCurrencyPrice = (price: number) => {
    const info = currencySymbols[baseCurrency] || { symbol: "$", position: "before", decimals: 2 }
    const formatted = price.toLocaleString(undefined, { minimumFractionDigits: info.decimals, maximumFractionDigits: info.decimals })
    return info.position === "before"
      ? `${info.symbol}${formatted}`
      : `${formatted}${info.symbol}`
  }

  // Handle coupon apply
  const handleCouponApply = (
    coupon: {
      id: string
      code: string
      type: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING" | "BOGO"
      description: string
    },
    discount: { usd: number; khr: number; description: string }
  ) => {
    setAppliedCoupon(coupon)
    setCouponDiscount(discount)
  }

  // Handle coupon remove
  const handleCouponRemove = () => {
    setAppliedCoupon(null)
    setCouponDiscount(null)
  }

  // Check if form is valid
  const isFormValid = fullName && phone && (selectedAddressId || (showNewAddressForm && newAddress.addressLine))

  // Success screen
  if (orderSuccess) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-16">
          <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-4">{tc.orderPlaced}</h1>
          <p className="text-lg text-muted-foreground mb-2">{tc.orderNumber}:</p>
          <p className="text-2xl font-bold text-primary mb-4">{orderNumber}</p>

          {selectedPayment === "CASH" && (
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              {t.payment.codInstructions}
            </p>
          )}

          <p className="text-muted-foreground mb-8">{tc.contactUs}</p>
          <Button onClick={onBackToShop} className="bg-primary text-primary-foreground">
            {tc.continueShopping}
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
          {t.payment.changeMethod}
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
            <span className="text-3xl">&#10060;</span>
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

  // Main checkout page - One-page layout with all steps visible
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button onClick={onBackToShop} variant="outline" className="mb-6 bg-transparent">
        {language === "EN" ? "Back to Shop" : "ត្រលប់ទៅហាង"}
      </Button>

      <h1 className="text-3xl font-bold text-foreground mb-8">{tc.title}</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Form - Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Contact Information */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <h2 className="text-xl font-semibold text-foreground">{tc.contactInfo}</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {tc.fullName} *
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
                  {tc.phoneNumber} *
                </label>
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value)
                      setAddressChecked(false)
                    }}
                    placeholder="+855 ..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={checkSavedAddresses}
                    disabled={!phone || phone.length < 8 || isCheckingAddresses}
                    className="bg-transparent whitespace-nowrap"
                  >
                    {isCheckingAddresses ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      tc.checkAddresses
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {tc.usePhoneForLookup}
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Delivery Address */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <h2 className="text-xl font-semibold text-foreground">{tc.deliveryAddress}</h2>
            </div>

            {/* Saved Addresses */}
            {addressChecked && savedAddresses.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-success mb-3">{tc.addressFound}</p>
                <div className="space-y-2">
                  {savedAddresses.map((addr) => (
                    <div
                      key={addr.id}
                      onClick={() => {
                        setSelectedAddressId(addr.id)
                        setShowNewAddressForm(false)
                        if (addr.fullName) setFullName(addr.fullName)
                      }}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedAddressId === addr.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {addr.label?.toLowerCase().includes("work") || addr.label?.toLowerCase().includes("office") ? (
                            <Building className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <Home className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{addr.label || tc.deliveryAddress}</span>
                            {addr.isDefault && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                {language === "EN" ? "Default" : "លំនាំដើម"}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {addr.addressLine}
                            {addr.commune && `, ${addr.commune}`}
                            {addr.district && `, ${addr.district}`}
                          </p>
                          <p className="text-sm text-muted-foreground">{addr.phone}</p>
                        </div>
                        {selectedAddressId === addr.id && (
                          <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {addressChecked && savedAddresses.length === 0 && (
              <p className="text-sm text-muted-foreground mb-4">{tc.noAddressFound}</p>
            )}

            {/* New Address Button */}
            {!showNewAddressForm && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowNewAddressForm(true)
                  setSelectedAddressId(null)
                }}
                className="w-full bg-transparent"
              >
                <Plus className="h-4 w-4 mr-2" />
                {tc.newAddress}
              </Button>
            )}

            {/* New Address Form */}
            {showNewAddressForm && (
              <div className="space-y-4 mt-4 p-4 border border-border rounded-lg bg-muted/30">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">{tc.newAddress}</h3>
                  {savedAddresses.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowNewAddressForm(false)
                        if (savedAddresses.length > 0) {
                          setSelectedAddressId(savedAddresses[0].id)
                        }
                      }}
                    >
                      {language === "EN" ? "Cancel" : "បោះបង់"}
                    </Button>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {tc.addressLabel}
                    </label>
                    <Input
                      type="text"
                      value={newAddress.label}
                      onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                      placeholder={tc.addressLabelPlaceholder}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {tc.province}
                    </label>
                    <Input
                      type="text"
                      value={newAddress.province}
                      onChange={(e) => setNewAddress({ ...newAddress, province: e.target.value })}
                      placeholder={language === "EN" ? "Phnom Penh" : "រាជធានីភ្នំពេញ"}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {tc.district}
                    </label>
                    <Input
                      type="text"
                      value={newAddress.district}
                      onChange={(e) => setNewAddress({ ...newAddress, district: e.target.value })}
                      placeholder={language === "EN" ? "Chamkar Mon" : "ចំការមន"}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {tc.commune}
                    </label>
                    <Input
                      type="text"
                      value={newAddress.commune}
                      onChange={(e) => setNewAddress({ ...newAddress, commune: e.target.value })}
                      placeholder={language === "EN" ? "Boeung Keng Kang" : "បឹងកេងកង"}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {tc.streetAddress} *
                  </label>
                  <Input
                    type="text"
                    value={newAddress.addressLine}
                    onChange={(e) => setNewAddress({ ...newAddress, addressLine: e.target.value })}
                    placeholder={language === "EN" ? "#123, Street 456" : "#១២៣, ផ្លូវលេខ ៤៥៦"}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {tc.landmark}
                  </label>
                  <Input
                    type="text"
                    value={newAddress.landmark}
                    onChange={(e) => setNewAddress({ ...newAddress, landmark: e.target.value })}
                    placeholder={tc.landmarkPlaceholder}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="save-address"
                    checked={saveAddressForFuture}
                    onCheckedChange={(checked) => setSaveAddressForFuture(checked === true)}
                  />
                  <label
                    htmlFor="save-address"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {tc.saveAddress}
                  </label>
                </div>
              </div>
            )}

            {/* Delivery Note */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                {tc.deliveryNote}
              </label>
              <textarea
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                placeholder={tc.deliveryNotePlaceholder}
                rows={3}
                className="w-full px-3 py-2 border border-border bg-background text-foreground placeholder-muted-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Section 3: Payment Method */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <h2 className="text-xl font-semibold text-foreground">{tc.paymentMethod}</h2>
            </div>

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
              <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                {language === "EN" ? "Failed to place order. Please try again." : "មិនអាចបញ្ជាទិញបានទេ។ សូមព្យាយាមម្តងទៀត។"}
              </div>
            )}
          </div>

          {/* Alternative: Order via Messaging (Mobile) */}
          <div className="lg:hidden bg-card border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground text-center mb-4">
              {language === "EN" ? "Or order via messaging apps" : "ឬបញ្ជាទិញតាមកម្មវិធីផ្ញើសារ"}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleOrderVia("telegram")}
                disabled={!isFormValid || createOrder.isPending}
                variant="outline"
                className="bg-transparent flex items-center justify-center gap-2"
              >
                <MessageCircle size={18} />
                Telegram
              </Button>

              <Button
                onClick={() => handleOrderVia("messenger")}
                disabled={!isFormValid || createOrder.isPending}
                variant="outline"
                className="bg-transparent flex items-center justify-center gap-2"
              >
                <Send size={18} />
                Messenger
              </Button>
            </div>
          </div>
        </div>

        {/* Order Summary Sidebar - Right Column (1/3 width) */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-lg p-6 sticky top-24">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-foreground">{tc.orderSummary}</h3>
              <span className="text-sm text-muted-foreground">
                {cart.length} {tc.items}
              </span>
            </div>

            {/* Cart Items with Quantity Edit */}
            <div className="space-y-4 mb-6 max-h-80 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.id} className="flex gap-3">
                  {/* Product Image */}
                  <div className="w-16 h-16 flex-shrink-0 bg-muted rounded-md overflow-hidden">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <MapPin className="h-6 w-6" />
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{item.name}</p>
                    <p className="text-sm text-primary font-medium">
                      {formatPrice(item.price)}
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center border border-border rounded">
                        <button
                          onClick={() => onUpdateQuantity?.(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="p-1 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-3 text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity?.(item.id, item.quantity + 1)}
                          className="p-1 hover:bg-muted"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => onRemoveItem?.(item.id)}
                        className="p-1 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Line Total */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-medium text-foreground text-sm">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="mb-4" />

            {/* Coupon Input */}
            <div className="mb-4">
              <CouponInput
                currency={currency}
                language={language}
                cartItems={cart.map((item) => ({
                  productId: item.id,
                  priceUsd: item.price,
                  quantity: item.quantity,
                }))}
                subtotalUsd={subtotal}
                shippingUsd={0}
                guestId={getOrCreateGuestId()}
                appliedCoupon={appliedCoupon}
                discount={couponDiscount}
                onApply={handleCouponApply}
                onRemove={handleCouponRemove}
              />
            </div>

            <Separator className="mb-4" />

            {/* Totals */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{tc.subtotal}</span>
                <span className="text-foreground font-medium">{formatPrice(subtotal)}</span>
              </div>

              {/* Discount line - only show if coupon applied */}
              {couponDiscount && (
                <div className="flex justify-between text-sm">
                  <span className="text-success">{tc.coupon.discount}</span>
                  <span className="text-success font-medium">-{formatPrice(couponDiscount.usd)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{tc.shipping}</span>
                <span className="text-success font-medium">{tc.freeShipping}</span>
              </div>

              {/* Conversion fee - only show if currency differs from base and fee is enabled */}
              {showConversionInfo && currency !== baseCurrency && conversionFeePercent > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {tCurrency?.conversionFee || "Conversion fee"} ({(conversionFeePercent * 100).toFixed(1)}%)
                  </span>
                  <span className="text-muted-foreground font-medium">
                    {formatPrice(conversionFeeAmount)}
                  </span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between text-lg font-bold">
                <span className="text-foreground">{tc.total}</span>
                <span className="text-primary">{formatPrice(totalWithFee)}</span>
              </div>

              {/* Exchange rate info - show when currency differs from base */}
              {showConversionInfo && currency !== baseCurrency && exchangeRate && (
                <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                  <div className="flex items-center gap-1">
                    <span>{tCurrency?.exchangeRate || "Exchange rate"}:</span>
                    <span className="font-medium">1 {baseCurrency} = {exchangeRate.toFixed(currency === "KHR" || currency === "VND" ? 0 : 2)} {currency}</span>
                  </div>
                  <div className="mt-1">
                    <span>{tCurrency?.settlementCurrency || "Settlement"}:</span>
                    <span className="font-medium ml-1">{formatBaseCurrencyPrice(finalTotal)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Trust Badges */}
            <TrustStrip language={language} className="mt-4 -mx-6 px-6" />

            {/* Place Order Button */}
            <Button
              onClick={handleCreateOrderAndPay}
              disabled={!isFormValid || isProcessingPayment || createOrder.isPending}
              className="w-full mt-6 bg-primary text-primary-foreground hover:bg-opacity-90 disabled:opacity-50 h-12 text-lg"
            >
              {isProcessingPayment || createOrder.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {tc.processing}
                </>
              ) : (
                <>
                  {(() => {
                    const Icon = PAYMENT_ICONS[selectedPayment]
                    return <Icon className="mr-2 h-5 w-5" />
                  })()}
                  {tc.placeOrder}
                </>
              )}
            </Button>

            {/* Alternative: Order via Messaging (Desktop) */}
            <div className="hidden lg:block mt-4">
              <Separator className="mb-4" />
              <p className="text-sm text-muted-foreground text-center mb-3">
                {language === "EN" ? "Or order via messaging" : "ឬបញ្ជាទិញតាមកម្មវិធីផ្ញើសារ"}
              </p>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => handleOrderVia("telegram")}
                  disabled={!isFormValid || createOrder.isPending}
                  variant="outline"
                  size="sm"
                  className="bg-transparent flex items-center justify-center gap-1"
                >
                  <MessageCircle size={16} />
                  Telegram
                </Button>

                <Button
                  onClick={() => handleOrderVia("messenger")}
                  disabled={!isFormValid || createOrder.isPending}
                  variant="outline"
                  size="sm"
                  className="bg-transparent flex items-center justify-center gap-1"
                >
                  <Send size={16} />
                  Messenger
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
