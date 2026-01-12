"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tag, X, Loader2, Check, AlertCircle } from "lucide-react"
import { translations } from "@/lib/i18n"

interface AppliedCoupon {
  id: string
  code: string
  type: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING" | "BOGO"
  description: string
}

interface CouponDiscount {
  usd: number
  khr: number
  description: string
}

interface CartItem {
  productId: string
  categoryId?: string
  priceUsd: number
  quantity: number
}

interface CouponInputProps {
  currency: "USD" | "KHR"
  language: "EN" | "KH"
  cartItems: CartItem[]
  subtotalUsd: number
  shippingUsd?: number
  customerId?: string
  guestId?: string
  appliedCoupon: AppliedCoupon | null
  discount: CouponDiscount | null
  onApply: (coupon: AppliedCoupon, discount: CouponDiscount) => void
  onRemove: () => void
}

export function CouponInput({
  currency,
  language,
  cartItems,
  subtotalUsd,
  shippingUsd = 0,
  customerId,
  guestId,
  appliedCoupon,
  discount,
  onApply,
  onRemove,
}: CouponInputProps) {
  const [code, setCode] = useState("")
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  const t = translations[language === "EN" ? "en" : "kh"]
  const tc = t.checkout.coupon

  const handleApply = async () => {
    if (!code.trim()) return

    setIsApplying(true)
    setError(null)

    try {
      const response = await fetch("/api/coupons/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          cartItems,
          subtotalUsd,
          shippingUsd,
          customerId,
          guestId,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        // Map API errors to user-friendly messages
        let errorMessage = data.error
        if (data.error.includes("not found")) {
          errorMessage = tc.invalid
        } else if (data.error.includes("expired")) {
          errorMessage = tc.expired
        } else if (data.error.includes("not yet valid")) {
          errorMessage = tc.notYetValid
        } else if (data.error.includes("usage limit reached")) {
          errorMessage = tc.usageLimit
        } else if (data.error.includes("already used")) {
          errorMessage = tc.alreadyUsed
        } else if (data.error.includes("Minimum order")) {
          errorMessage = tc.minOrder.replace("{amount}", `$${data.minOrderRequired?.toFixed(2) || "0.00"}`)
        }
        setError(errorMessage)
        return
      }

      // Successfully applied
      onApply(
        {
          id: data.coupon.id,
          code: data.coupon.code,
          type: data.coupon.type,
          description: data.coupon.description,
        },
        {
          usd: data.discount.usd,
          khr: data.discount.khr,
          description: data.discount.description,
        }
      )

      setCode("")
      setIsExpanded(false)
    } catch (err) {
      console.error("Error applying coupon:", err)
      setError(tc.invalid)
    } finally {
      setIsApplying(false)
    }
  }

  const handleRemove = () => {
    onRemove()
    setCode("")
    setError(null)
  }

  const formatDiscount = (usd: number) => {
    if (currency === "USD") {
      return `$${usd.toFixed(2)}`
    }
    return `${Math.round(usd * 4000)}៛`
  }

  // If a coupon is applied, show the applied state
  if (appliedCoupon && discount) {
    return (
      <div className="bg-success/10 border border-success/30 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-success/20 rounded-full flex items-center justify-center">
              <Check className="h-4 w-4 text-success" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{appliedCoupon.code}</span>
                <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded">
                  {tc.applied}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{discount.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{tc.saved}</p>
              <p className="font-bold text-success">-{formatDiscount(discount.usd)}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Collapsed state - just show the "Have a coupon?" prompt
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Tag className="h-4 w-4" />
        <span>{tc.title}</span>
      </button>
    )
  }

  // Expanded state - show input and apply button
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{tc.title}</span>
      </div>

      <div className="flex gap-2">
        <Input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase())
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              handleApply()
            }
          }}
          placeholder={tc.placeholder}
          className="flex-1 uppercase"
          disabled={isApplying}
        />
        <Button
          onClick={handleApply}
          disabled={!code.trim() || isApplying}
          className="bg-primary text-primary-foreground min-w-[80px]"
        >
          {isApplying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            tc.apply
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
