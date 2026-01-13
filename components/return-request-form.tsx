"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { translations } from "@/lib/i18n"
import { RotateCcw, Package, AlertCircle, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface OrderItem {
  id: string
  productId: string
  productName: string | null
  quantity: number
  priceUsd: number
  priceKhr: number
  product?: {
    id: string
    nameEn: string
    nameKh: string
    imageUrl?: string | null
  } | null
}

interface Order {
  id: string
  orderNumber: string
  status: string
  totalUsd: number
  totalKhr: number
  items: OrderItem[]
}

interface ReturnRequestFormProps {
  order: Order
  customerId: string
  language: "EN" | "KH"
  currency: "USD" | "KHR"
  onSuccess?: () => void
}

type ReturnReason =
  | "DEFECTIVE"
  | "WRONG_ITEM"
  | "NOT_AS_DESCRIBED"
  | "CHANGED_MIND"
  | "SIZE_FIT"
  | "QUALITY"
  | "LATE_DELIVERY"
  | "OTHER"

const RETURN_REASONS: { value: ReturnReason; labelEn: string; labelKh: string }[] = [
  { value: "DEFECTIVE", labelEn: "Product Defective/Damaged", labelKh: "ផលិតផលខូច/ខូច" },
  { value: "WRONG_ITEM", labelEn: "Wrong Item Delivered", labelKh: "ផលិតផលខុស" },
  { value: "NOT_AS_DESCRIBED", labelEn: "Not as Described", labelKh: "មិនដូចការពិពណ៌នា" },
  { value: "CHANGED_MIND", labelEn: "Changed Mind", labelKh: "ប្តូរចិត្ត" },
  { value: "SIZE_FIT", labelEn: "Size/Fit Issue", labelKh: "បញ្ហាទំហំ/ទម្រង់" },
  { value: "QUALITY", labelEn: "Quality Issue", labelKh: "បញ្ហាគុណភាព" },
  { value: "LATE_DELIVERY", labelEn: "Late Delivery", labelKh: "ដឹកជញ្ជូនយឺត" },
  { value: "OTHER", labelEn: "Other", labelKh: "ផ្សេងៗ" },
]

export function ReturnRequestForm({
  order,
  customerId,
  language,
  currency,
  onSuccess,
}: ReturnRequestFormProps) {
  const [open, setOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map())
  const [reason, setReason] = useState<ReturnReason | "">("")
  const [reasonDetails, setReasonDetails] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const t = translations[language === "EN" ? "en" : "kh"].returns

  const isEligible = order.status === "COMPLETED"

  const toggleItem = (itemId: string, checked: boolean, maxQty: number) => {
    const newSelected = new Map(selectedItems)
    if (checked) {
      newSelected.set(itemId, maxQty) // Default to full quantity
    } else {
      newSelected.delete(itemId)
    }
    setSelectedItems(newSelected)
  }

  const updateQuantity = (itemId: string, qty: number) => {
    const newSelected = new Map(selectedItems)
    if (qty > 0) {
      newSelected.set(itemId, qty)
    } else {
      newSelected.delete(itemId)
    }
    setSelectedItems(newSelected)
  }

  const calculateRefund = () => {
    let total = 0
    for (const [itemId, qty] of selectedItems.entries()) {
      const item = order.items.find((i) => i.id === itemId)
      if (item) {
        total += (currency === "USD" ? Number(item.priceUsd) : item.priceKhr) * qty
      }
    }
    return total
  }

  const formatPrice = (amount: number) => {
    if (currency === "USD") {
      return `$${amount.toFixed(2)}`
    }
    return `${amount.toLocaleString()} KHR`
  }

  const handleSubmit = async () => {
    if (selectedItems.size === 0) {
      setError(t.selectOneItem)
      return
    }
    if (!reason) {
      setError(language === "EN" ? "Please select a reason" : "សូមជ្រើសរើសមូលហេតុ")
      return
    }

    setIsSubmitting(true)
    setError(null)

    // Prepare items for API
    const returnItems = Array.from(selectedItems.entries()).map(([itemId, qty]) => {
      const item = order.items.find((i) => i.id === itemId)!
      return {
        orderItemId: itemId,
        productId: item.productId,
        productName: item.product?.nameEn || item.productName || "Unknown",
        quantity: qty,
        priceUsd: Number(item.priceUsd),
      }
    })

    try {
      const response = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          customerId,
          reason,
          reasonDetails: reasonDetails || undefined,
          items: returnItems,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to submit return request")
      }

      setSuccess(true)
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
        setSelectedItems(new Map())
        setReason("")
        setReasonDetails("")
        onSuccess?.()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isEligible) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <RotateCcw className="h-4 w-4" />
        {t.requestReturn}
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          {t.requestReturn}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t.returnRequest}
          </DialogTitle>
          <DialogDescription>
            {t.returnPolicyNote}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700">
              {t.successMessage}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Select Items */}
            <div className="space-y-3">
              <Label className="text-base font-medium">{t.selectItems}</Label>
              <div className="space-y-3 rounded-lg border p-4">
                {order.items.map((item) => {
                  const isSelected = selectedItems.has(item.id)
                  const selectedQty = selectedItems.get(item.id) || 0
                  const itemName =
                    language === "EN"
                      ? item.product?.nameEn || item.productName
                      : item.product?.nameKh || item.productName

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 rounded-lg border p-3"
                    >
                      <Checkbox
                        id={item.id}
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          toggleItem(item.id, checked as boolean, item.quantity)
                        }
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={item.id}
                          className="cursor-pointer font-medium"
                        >
                          {itemName}
                        </label>
                        <p className="text-sm text-muted-foreground">
                          {formatPrice(
                            currency === "USD"
                              ? Number(item.priceUsd)
                              : item.priceKhr
                          )}{" "}
                          x {item.quantity}
                        </p>
                      </div>
                      {isSelected && item.quantity > 1 && (
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">{t.quantity}:</Label>
                          <Select
                            value={selectedQty.toString()}
                            onValueChange={(val) =>
                              updateQuantity(item.id, parseInt(val))
                            }
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: item.quantity }, (_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                  {i + 1}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Return Reason */}
            <div className="space-y-2">
              <Label className="text-base font-medium">{t.reason}</Label>
              <Select
                value={reason}
                onValueChange={(val) => setReason(val as ReturnReason)}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      language === "EN"
                        ? "Select a reason..."
                        : "ជ្រើសរើសមូលហេតុ..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {language === "EN" ? r.labelEn : r.labelKh}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Additional Details */}
            <div className="space-y-2">
              <Label className="text-base font-medium">{t.reasonDetails}</Label>
              <Textarea
                value={reasonDetails}
                onChange={(e) => setReasonDetails(e.target.value)}
                placeholder={t.enterDetails}
                rows={3}
              />
            </div>

            {/* Refund Summary */}
            {selectedItems.size > 0 && (
              <div className="rounded-lg bg-muted p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{t.refundAmount}</span>
                  <span className="text-lg font-bold">
                    {formatPrice(calculateRefund())}
                  </span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setOpen(false)}>
                {language === "EN" ? "Cancel" : "បោះបង់"}
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting
                  ? language === "EN"
                    ? "Submitting..."
                    : "កំពុងបញ្ជូន..."
                  : t.submitRequest}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
