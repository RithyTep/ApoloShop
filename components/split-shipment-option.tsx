"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Package,
  Truck,
  Clock,
  CheckCircle,
  AlertCircle,
  PackageX,
  CalendarClock,
  DollarSign,
} from "lucide-react"
import { translations } from "@/lib/i18n"

interface CartItem {
  id: string
  productId?: string
  quantity: number
}

interface ItemAvailability {
  productId: string
  productName: string
  productSku?: string
  quantity: number
  availableQuantity: number
  availabilityStatus: "in_stock" | "low_stock" | "backordered" | "preorder" | "out_of_stock"
  expectedAvailableDate?: string | null
  canShipNow: boolean
}

interface SplitShipmentOptions {
  canSplit: boolean
  reason?: string
  immediateShipment: {
    items: ItemAvailability[]
    estimatedShipDate: string
    shippingCharge: number
  }
  delayedShipment: {
    items: ItemAvailability[]
    estimatedShipDate: string
    shippingCharge: number
  }
  combinedShipment: {
    items: ItemAvailability[]
    estimatedShipDate: string
    shippingCharge: number
    savings: number
  }
}

interface SplitShipmentOptionProps {
  cartItems: CartItem[]
  currency: string
  language: "EN" | "KH"
  onOptionChange: (option: "split" | "combined") => void
  selectedOption: "split" | "combined"
}

export function SplitShipmentOption({
  cartItems,
  currency,
  language,
  onOptionChange,
  selectedOption,
}: SplitShipmentOptionProps) {
  const [options, setOptions] = useState<SplitShipmentOptions | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const t = translations[language === "EN" ? "en" : "kh"]
  const ts = t.splitShipment || {
    title: language === "EN" ? "Shipping Options" : "ជម្រើសដឹកជញ្ជូន",
    splitShipment: language === "EN" ? "Split Shipment" : "ដឹកជញ្ជូនដាច់ពីគ្នា",
    combinedShipment: language === "EN" ? "Wait for All Items" : "រង់ចាំទំនិញទាំងអស់",
    splitDescription: language === "EN" ? "Ship available items now, remaining items later" : "ដឹកជញ្ជូនទំនិញដែលមានឥឡូវ ចំណែកដែលនៅសល់ពេលក្រោយ",
    combinedDescription: language === "EN" ? "Wait until all items are available" : "រង់ចាំរហូតទាល់តែទំនិញទាំងអស់មាន",
    immediateShipment: language === "EN" ? "Ships Immediately" : "ដឹកជញ្ជូនភ្លាមៗ",
    delayedShipment: language === "EN" ? "Ships Later" : "ដឹកជញ្ជូនពេលក្រោយ",
    inStock: language === "EN" ? "In Stock" : "មានក្នុងស្តុក",
    lowStock: language === "EN" ? "Low Stock" : "ស្តុកទាប",
    backordered: language === "EN" ? "Backordered" : "កំពុងរង់ចាំស្តុក",
    preorder: language === "EN" ? "Pre-order" : "បញ្ជាទិញមុន",
    outOfStock: language === "EN" ? "Out of Stock" : "អស់ស្តុក",
    estimatedDate: language === "EN" ? "Est. Ship Date" : "កាលបរិច្ឆេទប្រមាណ",
    shippingCost: language === "EN" ? "Shipping" : "ការដឹកជញ្ជូន",
    saveMoney: language === "EN" ? "Save" : "សន្សំ",
    totalShipping: language === "EN" ? "Total Shipping" : "សរុបការដឹកជញ្ជូន",
    recommended: language === "EN" ? "Recommended" : "បានណែនាំ",
    fasterDelivery: language === "EN" ? "Get available items faster" : "ទទួលទំនិញដែលមានលឿនជាង",
    noSplitNeeded: language === "EN" ? "All items available for immediate shipping" : "ទំនិញទាំងអស់មានសម្រាប់ដឹកជញ្ជូនភ្លាមៗ",
    allItemsDelayed: language === "EN" ? "All items require additional processing time" : "ទំនិញទាំងអស់ត្រូវការពេលដំណើរការបន្ថែម",
    items: language === "EN" ? "items" : "ទំនិញ",
  }

  useEffect(() => {
    const fetchOptions = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const items = cartItems
          .filter(item => item.productId)
          .map(item => ({
            productId: item.productId || item.id,
            quantity: item.quantity,
          }))

        const response = await fetch(
          `/api/shipments?action=split-options&items=${encodeURIComponent(JSON.stringify(items))}`
        )

        if (!response.ok) {
          throw new Error("Failed to fetch shipping options")
        }

        const data = await response.json()
        setOptions(data.options)
      } catch (err) {
        console.error("Error fetching split shipment options:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setIsLoading(false)
      }
    }

    if (cartItems.length > 0) {
      fetchOptions()
    }
  }, [cartItems])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(language === "EN" ? "en-US" : "km-KH", {
      month: "short",
      day: "numeric",
    })
  }

  const formatPrice = (amount: number) => {
    if (currency === "USD") {
      return `$${amount.toFixed(2)}`
    }
    return `${Math.round(amount * 4000).toLocaleString()}៛`
  }

  const getStatusBadge = (status: ItemAvailability["availabilityStatus"]) => {
    const statusConfig = {
      in_stock: { label: ts.inStock, variant: "default" as const, icon: CheckCircle },
      low_stock: { label: ts.lowStock, variant: "secondary" as const, icon: AlertCircle },
      backordered: { label: ts.backordered, variant: "outline" as const, icon: Clock },
      preorder: { label: ts.preorder, variant: "secondary" as const, icon: CalendarClock },
      out_of_stock: { label: ts.outOfStock, variant: "destructive" as const, icon: PackageX },
    }

    const config = statusConfig[status]
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="text-xs gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!options) {
    return null
  }

  // If split is not available, don't show the option
  if (!options.canSplit) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="h-5 w-5" />
            {ts.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              {options.immediateShipment.items.length === options.combinedShipment.items.length
                ? ts.noSplitNeeded
                : ts.allItemsDelayed}
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{ts.estimatedDate}:</span>
            <span className="font-medium">{formatDate(options.combinedShipment.estimatedShipDate)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{ts.shippingCost}:</span>
            <span className="font-medium">{formatPrice(options.combinedShipment.shippingCharge)}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalSplitShipping = options.immediateShipment.shippingCharge + options.delayedShipment.shippingCharge

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Truck className="h-5 w-5" />
          {ts.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedOption}
          onValueChange={(value) => onOptionChange(value as "split" | "combined")}
          className="space-y-4"
        >
          {/* Split Shipment Option */}
          <div className="relative">
            <div
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedOption === "split" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
              onClick={() => onOptionChange("split")}
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value="split" id="split" className="mt-1" />
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="split" className="font-medium cursor-pointer">
                      {ts.splitShipment}
                    </Label>
                    <Badge variant="default" className="text-xs gap-1">
                      <Clock className="h-3 w-3" />
                      {ts.fasterDelivery}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{ts.splitDescription}</p>

                  {/* Immediate Shipment */}
                  <div className="bg-green-50 dark:bg-green-950/30 rounded-md p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-400">
                        {ts.immediateShipment}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({options.immediateShipment.items.length} {ts.items})
                      </span>
                    </div>
                    <div className="space-y-1">
                      {options.immediateShipment.items.slice(0, 3).map((item) => (
                        <div key={item.productId} className="flex items-center justify-between text-xs">
                          <span className="truncate max-w-[200px]">{item.productName}</span>
                          {getStatusBadge(item.availabilityStatus)}
                        </div>
                      ))}
                      {options.immediateShipment.items.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{options.immediateShipment.items.length - 3} more
                        </span>
                      )}
                    </div>
                    <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-800 flex justify-between text-xs">
                      <span>{ts.estimatedDate}: {formatDate(options.immediateShipment.estimatedShipDate)}</span>
                      <span>{formatPrice(options.immediateShipment.shippingCharge)}</span>
                    </div>
                  </div>

                  {/* Delayed Shipment */}
                  <div className="bg-amber-50 dark:bg-amber-950/30 rounded-md p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        {ts.delayedShipment}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({options.delayedShipment.items.length} {ts.items})
                      </span>
                    </div>
                    <div className="space-y-1">
                      {options.delayedShipment.items.slice(0, 3).map((item) => (
                        <div key={item.productId} className="flex items-center justify-between text-xs">
                          <span className="truncate max-w-[200px]">{item.productName}</span>
                          {getStatusBadge(item.availabilityStatus)}
                        </div>
                      ))}
                      {options.delayedShipment.items.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{options.delayedShipment.items.length - 3} more
                        </span>
                      )}
                    </div>
                    <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800 flex justify-between text-xs">
                      <span>{ts.estimatedDate}: {formatDate(options.delayedShipment.estimatedShipDate)}</span>
                      <span>{formatPrice(options.delayedShipment.shippingCharge)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm font-medium">{ts.totalShipping}</span>
                    <span className="font-semibold">{formatPrice(totalSplitShipping)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Combined Shipment Option */}
          <div className="relative">
            <div
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedOption === "combined" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
              onClick={() => onOptionChange("combined")}
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value="combined" id="combined" className="mt-1" />
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="combined" className="font-medium cursor-pointer">
                      {ts.combinedShipment}
                    </Label>
                    {options.combinedShipment.savings > 0 && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <DollarSign className="h-3 w-3" />
                        {ts.saveMoney} {formatPrice(options.combinedShipment.savings)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{ts.combinedDescription}</p>

                  <div className="bg-muted/50 rounded-md p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {options.combinedShipment.items.length} {ts.items}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>{ts.estimatedDate}: {formatDate(options.combinedShipment.estimatedShipDate)}</span>
                      <span>{formatPrice(options.combinedShipment.shippingCharge)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm font-medium">{ts.totalShipping}</span>
                    <span className="font-semibold">{formatPrice(options.combinedShipment.shippingCharge)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  )
}
