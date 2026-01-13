"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { CartItem } from "@/lib/shop-context"
import {
  MapPin,
  Plus,
  Minus,
  Trash2,
  Gift,
  ChevronRight,
  ChevronDown,
  Package,
  Truck,
  Check,
  Loader2,
  ArrowLeft,
} from "lucide-react"
import { translations } from "@/lib/i18n"

interface ShippingAddress {
  id?: string
  label?: string
  fullName: string
  phone: string
  province: string
  district: string
  commune?: string
  addressLine: string
  landmark?: string
}

interface ShipmentGroup {
  id: string
  address: ShippingAddress
  items: CartItem[]
  giftMessage?: string
  isGift: boolean
  shippingCostUsd: number
  shippingCostKhr: number
  estimatedDelivery?: { minDays: number; maxDays: number }
}

interface MultiAddressCheckoutProps {
  cart: CartItem[]
  currency: string
  language: "EN" | "KH"
  onBackToShop: () => void
  onBackToCheckout: () => void
  onOrderComplete?: () => void
}

// Generate unique ID
function generateId(): string {
  return `shipment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// Guest ID storage
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

export function MultiAddressCheckout({
  cart,
  currency,
  language,
  onBackToShop,
  onBackToCheckout,
  onOrderComplete,
}: MultiAddressCheckoutProps) {
  const t = translations[language === "EN" ? "en" : "kh"]
  const tc = t.checkout
  const tm = t.multiAddress

  // Contact info state
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")

  // Shipment groups state
  const [shipmentGroups, setShipmentGroups] = useState<ShipmentGroup[]>([
    {
      id: generateId(),
      address: {
        fullName: "",
        phone: "",
        province: "",
        district: "",
        addressLine: "",
      },
      items: [...cart],
      isGift: false,
      shippingCostUsd: 0,
      shippingCostKhr: 0,
    },
  ])

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<ShippingAddress[]>([])

  // UI state
  const [expandedShipment, setExpandedShipment] = useState<string | null>(shipmentGroups[0]?.id || null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [orderNumber, setOrderNumber] = useState("")
  const [shipmentNumbers, setShipmentNumbers] = useState<string[]>([])

  // Check for saved addresses when phone changes
  const checkSavedAddresses = useCallback(async () => {
    if (!phone || phone.length < 8) return

    try {
      const response = await fetch(`/api/shipping-addresses?phone=${encodeURIComponent(phone)}`)
      if (response.ok) {
        const data = await response.json()
        setSavedAddresses(data.addresses || [])
      }
    } catch (error) {
      console.error("Error checking addresses:", error)
    }
  }, [phone])

  useEffect(() => {
    const debounce = setTimeout(checkSavedAddresses, 500)
    return () => clearTimeout(debounce)
  }, [checkSavedAddresses])

  // Calculate shipping for each shipment group
  const calculateShipping = useCallback(async () => {
    const updatedGroups = [...shipmentGroups]

    for (let i = 0; i < updatedGroups.length; i++) {
      const group = updatedGroups[i]
      if (!group.address.province) continue

      const cartTotalUsd = group.items.reduce((sum, item) => sum + item.price * item.quantity, 0)

      try {
        const response = await fetch("/api/shipping-zones/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            region: group.address.province,
            cartTotalUsd,
            cartTotalKhr: Math.round(cartTotalUsd * 4000),
          }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.available && data.recommended) {
            updatedGroups[i] = {
              ...group,
              shippingCostUsd: data.recommended.shippingCostUsd,
              shippingCostKhr: data.recommended.shippingCostKhr,
              estimatedDelivery: data.recommended.estimatedDelivery,
            }
          }
        }
      } catch (error) {
        console.error("Error calculating shipping:", error)
      }
    }

    setShipmentGroups(updatedGroups)
  }, [shipmentGroups])

  // Recalculate shipping when addresses change
  useEffect(() => {
    const addresses = shipmentGroups.map((g) => g.address.province).filter(Boolean)
    if (addresses.length > 0) {
      calculateShipping()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipmentGroups.map((g) => g.address.province).join(",")])

  // Add new shipment group
  const addShipmentGroup = () => {
    const newGroup: ShipmentGroup = {
      id: generateId(),
      address: {
        fullName: "",
        phone: "",
        province: "",
        district: "",
        addressLine: "",
      },
      items: [],
      isGift: false,
      shippingCostUsd: 0,
      shippingCostKhr: 0,
    }
    setShipmentGroups([...shipmentGroups, newGroup])
    setExpandedShipment(newGroup.id)
  }

  // Remove shipment group
  const removeShipmentGroup = (groupId: string) => {
    if (shipmentGroups.length <= 1) return

    const groupToRemove = shipmentGroups.find((g) => g.id === groupId)
    const remainingGroups = shipmentGroups.filter((g) => g.id !== groupId)

    // Move items from removed group to first remaining group
    if (groupToRemove && groupToRemove.items.length > 0) {
      remainingGroups[0] = {
        ...remainingGroups[0],
        items: [...remainingGroups[0].items, ...groupToRemove.items],
      }
    }

    setShipmentGroups(remainingGroups)
    if (expandedShipment === groupId) {
      setExpandedShipment(remainingGroups[0]?.id || null)
    }
  }

  // Update shipment address
  const updateShipmentAddress = (groupId: string, field: keyof ShippingAddress, value: string) => {
    setShipmentGroups((groups) =>
      groups.map((g) =>
        g.id === groupId
          ? { ...g, address: { ...g.address, [field]: value } }
          : g
      )
    )
  }

  // Select saved address for shipment
  const selectSavedAddress = (groupId: string, addressId: string) => {
    const address = savedAddresses.find((a) => a.id === addressId)
    if (!address) return

    setShipmentGroups((groups) =>
      groups.map((g) =>
        g.id === groupId
          ? { ...g, address: { ...address } }
          : g
      )
    )
  }

  // Move item between shipments
  const moveItemToShipment = (itemId: string, fromGroupId: string, toGroupId: string) => {
    setShipmentGroups((groups) => {
      const fromGroup = groups.find((g) => g.id === fromGroupId)
      const item = fromGroup?.items.find((i) => i.id === itemId)

      if (!item) return groups

      return groups.map((g) => {
        if (g.id === fromGroupId) {
          return { ...g, items: g.items.filter((i) => i.id !== itemId) }
        }
        if (g.id === toGroupId) {
          return { ...g, items: [...g.items, item] }
        }
        return g
      })
    })
  }

  // Update gift options
  const updateGiftOptions = (groupId: string, field: "isGift" | "giftMessage", value: boolean | string) => {
    setShipmentGroups((groups) =>
      groups.map((g) =>
        g.id === groupId ? { ...g, [field]: value } : g
      )
    )
  }

  // Calculate totals
  const subtotalUsd = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalShippingUsd = shipmentGroups.reduce((sum, g) => sum + g.shippingCostUsd, 0)
  const totalUsd = subtotalUsd + totalShippingUsd

  // Format price
  const formatPrice = (usd: number) => {
    if (currency === "KHR") {
      return `${Math.round(usd * 4000).toLocaleString()} ៛`
    }
    return `$${usd.toFixed(2)}`
  }

  // Check if all items are assigned
  const allItemsAssigned = () => {
    const assignedItemIds = new Set(shipmentGroups.flatMap((g) => g.items.map((i) => i.id)))
    return cart.every((item) => assignedItemIds.has(item.id))
  }

  // Validate checkout
  const canCheckout = () => {
    if (!fullName || !phone) return false
    if (!allItemsAssigned()) return false

    for (const group of shipmentGroups) {
      if (group.items.length === 0) return false
      if (!group.address.fullName || !group.address.phone || !group.address.addressLine) return false
    }

    return true
  }

  // Handle checkout
  const handleCheckout = async () => {
    if (!canCheckout()) return

    setIsProcessing(true)

    try {
      const response = await fetch("/api/checkout/multi-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId: getOrCreateGuestId(),
          phone,
          fullName,
          shipments: shipmentGroups.map((group) => ({
            address: group.address,
            items: group.items.map((item) => ({
              productId: item.id,
              quantity: item.quantity,
              priceUsd: item.price,
              priceKhr: Math.round(item.price * 4000),
            })),
            giftMessage: group.giftMessage,
            isGift: group.isGift,
            recipientName: group.address.fullName,
            recipientPhone: group.address.phone,
            shippingCostUsd: group.shippingCostUsd,
            shippingCostKhr: group.shippingCostKhr,
          })),
          paymentMethod: "CASH",
          currency,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setOrderSuccess(true)
        setOrderNumber(data.orderNumber)
        setShipmentNumbers(data.shipments.map((s: { shipmentNumber: string }) => s.shipmentNumber))
        onOrderComplete?.()
      } else {
        alert(data.error || "Failed to place order")
      }
    } catch (error) {
      console.error("Checkout error:", error)
      alert("Failed to place order. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  // Success screen
  if (orderSuccess) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2">{tm.orderSuccess}</h2>
        <p className="text-muted-foreground mb-4">
          {language === "EN" ? "Order Number:" : "លេខបញ្ជាទិញ:"} <span className="font-mono font-bold">{orderNumber}</span>
        </p>
        <p className="text-sm text-muted-foreground mb-6">{tm.trackingInfo}</p>

        <div className="bg-muted/50 rounded-lg p-4 mb-6">
          <h3 className="font-medium mb-2">{language === "EN" ? "Shipment Tracking Numbers" : "លេខតាមដានការដឹកជញ្ជូន"}</h3>
          <div className="space-y-1">
            {shipmentNumbers.map((num, i) => (
              <div key={num} className="flex items-center justify-center gap-2">
                <Badge variant="outline">{tm.shipmentNumber} {String.fromCharCode(65 + i)}</Badge>
                <span className="font-mono text-sm">{num}</span>
              </div>
            ))}
          </div>
        </div>

        <Button onClick={onBackToShop}>
          {language === "EN" ? "Continue Shopping" : "បន្តការទិញទំនិញ"}
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pb-32">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={onBackToCheckout}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{tm.title}</h1>
          <p className="text-muted-foreground text-sm">{tm.subtitle}</p>
        </div>
      </div>

      {/* Contact Info */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{tc.contactInfo}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName">{tc.fullName}</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={language === "EN" ? "Your name" : "ឈ្មោះរបស់អ្នក"}
              />
            </div>
            <div>
              <Label htmlFor="phone">{tc.phoneNumber}</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="012 345 678"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipment Groups */}
      <div className="space-y-4 mb-6">
        {shipmentGroups.map((group, index) => (
          <Card key={group.id} className="overflow-hidden">
            <CardHeader
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setExpandedShipment(expandedShipment === group.id ? null : group.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {String.fromCharCode(65 + index)}
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {tm.shipmentNumber} {String.fromCharCode(65 + index)}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {group.items.length} {language === "EN" ? "items" : "មុខទំនិញ"}
                      {group.address.province && ` • ${group.address.province}`}
                      {group.isGift && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          <Gift className="w-3 h-3 mr-1" />
                          {language === "EN" ? "Gift" : "អំណោយ"}
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {group.shippingCostUsd > 0 && (
                    <span className="text-sm text-muted-foreground">
                      +{formatPrice(group.shippingCostUsd)}
                    </span>
                  )}
                  {expandedShipment === group.id ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>

            {expandedShipment === group.id && (
              <CardContent className="border-t pt-4 space-y-6">
                {/* Items in this shipment */}
                <div>
                  <Label className="mb-2 block">{tm.selectItems}</Label>
                  {group.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">{tm.noItemsAssigned}</p>
                  ) : (
                    <div className="space-y-2">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
                        >
                          <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity}x {formatPrice(item.price)}
                            </p>
                          </div>
                          {shipmentGroups.length > 1 && (
                            <Select
                              value={group.id}
                              onValueChange={(toGroupId) => moveItemToShipment(item.id, group.id, toGroupId)}
                            >
                              <SelectTrigger className="w-24 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {shipmentGroups.map((g, i) => (
                                  <SelectItem key={g.id} value={g.id}>
                                    {tm.shipmentNumber} {String.fromCharCode(65 + i)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Shipping Address */}
                <div>
                  <Label className="mb-2 block flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {tc.selectAddress}
                  </Label>

                  {/* Saved addresses dropdown */}
                  {savedAddresses.length > 0 && (
                    <Select
                      onValueChange={(addressId) => selectSavedAddress(group.id, addressId)}
                    >
                      <SelectTrigger className="mb-4">
                        <SelectValue placeholder={tc.savedAddresses} />
                      </SelectTrigger>
                      <SelectContent>
                        {savedAddresses.map((addr) => (
                          <SelectItem key={addr.id} value={addr.id!}>
                            {addr.label || addr.addressLine.substring(0, 30)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`${group.id}-name`}>{tc.fullName}</Label>
                      <Input
                        id={`${group.id}-name`}
                        value={group.address.fullName}
                        onChange={(e) => updateShipmentAddress(group.id, "fullName", e.target.value)}
                        placeholder={language === "EN" ? "Recipient name" : "ឈ្មោះអ្នកទទួល"}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`${group.id}-phone`}>{tc.phoneNumber}</Label>
                      <Input
                        id={`${group.id}-phone`}
                        type="tel"
                        value={group.address.phone}
                        onChange={(e) => updateShipmentAddress(group.id, "phone", e.target.value)}
                        placeholder="012 345 678"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`${group.id}-province`}>{tc.province}</Label>
                      <Input
                        id={`${group.id}-province`}
                        value={group.address.province}
                        onChange={(e) => updateShipmentAddress(group.id, "province", e.target.value)}
                        placeholder={language === "EN" ? "Province/City" : "ខេត្ត/រាជធានី"}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`${group.id}-district`}>{tc.district}</Label>
                      <Input
                        id={`${group.id}-district`}
                        value={group.address.district}
                        onChange={(e) => updateShipmentAddress(group.id, "district", e.target.value)}
                        placeholder={language === "EN" ? "District" : "ស្រុក/ខណ្ឌ"}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor={`${group.id}-address`}>{tc.streetAddress}</Label>
                      <Input
                        id={`${group.id}-address`}
                        value={group.address.addressLine}
                        onChange={(e) => updateShipmentAddress(group.id, "addressLine", e.target.value)}
                        placeholder={language === "EN" ? "Street address, building, floor..." : "អាសយដ្ឋានផ្លូវ អគារ ជាន់..."}
                      />
                    </div>
                  </div>

                  {/* Shipping estimate */}
                  {group.estimatedDelivery && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <Truck className="w-4 h-4" />
                      {language === "EN"
                        ? `Estimated delivery: ${group.estimatedDelivery.minDays}-${group.estimatedDelivery.maxDays} days`
                        : `ការដឹកជញ្ជូនប៉ាន់ស្មាន: ${group.estimatedDelivery.minDays}-${group.estimatedDelivery.maxDays} ថ្ងៃ`}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Gift Options */}
                <div>
                  <Label className="mb-2 block flex items-center gap-2">
                    <Gift className="w-4 h-4" />
                    {tm.giftOptions}
                  </Label>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`${group.id}-gift`}
                        checked={group.isGift}
                        onCheckedChange={(checked) => updateGiftOptions(group.id, "isGift", checked === true)}
                      />
                      <Label htmlFor={`${group.id}-gift`} className="cursor-pointer">
                        {tm.hidePrice}
                      </Label>
                    </div>

                    <div>
                      <Label htmlFor={`${group.id}-message`}>{tm.giftMessage}</Label>
                      <Textarea
                        id={`${group.id}-message`}
                        value={group.giftMessage || ""}
                        onChange={(e) => updateGiftOptions(group.id, "giftMessage", e.target.value)}
                        placeholder={tm.giftMessagePlaceholder}
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Remove shipment button */}
                {shipmentGroups.length > 1 && (
                  <>
                    <Separator />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeShipmentGroup(group.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {tm.removeShipment}
                    </Button>
                  </>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Add Shipment Button */}
      <Button variant="outline" className="w-full mb-6" onClick={addShipmentGroup}>
        <Plus className="w-4 h-4 mr-2" />
        {tm.addShipment}
      </Button>

      {/* Warning if items not assigned */}
      {!allItemsAssigned() && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 p-4 rounded-lg mb-6 text-sm">
          {tm.itemsNotAssigned}
        </div>
      )}

      {/* Order Summary Fixed Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">{tm.combinedTotal}</p>
              <p className="text-2xl font-bold">{formatPrice(totalUsd)}</p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>{tc.subtotal}: {formatPrice(subtotalUsd)}</p>
              <p>{tm.shippingPerAddress}: {formatPrice(totalShippingUsd)}</p>
            </div>
          </div>
          <Button
            className="w-full"
            size="lg"
            disabled={!canCheckout() || isProcessing}
            onClick={handleCheckout}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {tm.processing}
              </>
            ) : (
              <>
                <Truck className="w-4 h-4 mr-2" />
                {tm.placeOrder}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
