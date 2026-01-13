"use client"

import { Button } from "@/components/ui/button"
import { GitCompareArrows, Check, X } from "lucide-react"
import { useComparison, MAX_COMPARE_PRODUCTS } from "@/lib/comparison-context"
import { Product } from "@/lib/api-hooks"
import { cn } from "@/lib/utils"
import { translations } from "@/lib/i18n"

interface CompareButtonProps {
  product: Product
  language: "EN" | "KH"
  size?: "sm" | "default"
  variant?: "icon" | "full"
  className?: string
}

export function CompareButton({
  product,
  language,
  size = "sm",
  variant = "icon",
  className,
}: CompareButtonProps) {
  const { addToCompare, removeFromCompare, isInCompare, canAddMore } = useComparison()
  const inCompare = isInCompare(product.id)

  const t = translations[language === "EN" ? "en" : "kh"]
  const compareT = t.compare || {
    add: language === "EN" ? "Add to compare" : "បន្ថែមដើម្បីប្រៀបធៀប",
    remove: language === "EN" ? "Remove from compare" : "ដកចេញពីការប្រៀបធៀប",
    maxReached: language === "EN" ? `Max ${MAX_COMPARE_PRODUCTS} items` : `អតិបរមា ${MAX_COMPARE_PRODUCTS} ផលិតផល`,
  }

  const handleClick = () => {
    if (inCompare) {
      removeFromCompare(product.id)
    } else if (canAddMore) {
      addToCompare(product)
    }
  }

  const isDisabled = !inCompare && !canAddMore

  if (variant === "icon") {
    return (
      <Button
        variant={inCompare ? "default" : "outline"}
        size="icon"
        className={cn(
          "transition-all",
          size === "sm" ? "h-8 w-8" : "h-10 w-10",
          inCompare && "bg-primary text-primary-foreground",
          className
        )}
        onClick={handleClick}
        disabled={isDisabled}
        title={isDisabled ? compareT.maxReached : inCompare ? compareT.remove : compareT.add}
        aria-label={isDisabled ? compareT.maxReached : inCompare ? compareT.remove : compareT.add}
      >
        {inCompare ? (
          <Check size={size === "sm" ? 14 : 16} />
        ) : (
          <GitCompareArrows size={size === "sm" ? 14 : 16} />
        )}
      </Button>
    )
  }

  return (
    <Button
      variant={inCompare ? "default" : "outline"}
      size={size}
      className={cn("transition-all gap-2", className)}
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={isDisabled ? compareT.maxReached : inCompare ? compareT.remove : compareT.add}
    >
      {inCompare ? (
        <>
          <Check size={size === "sm" ? 14 : 16} />
          <span>{compareT.remove}</span>
        </>
      ) : (
        <>
          <GitCompareArrows size={size === "sm" ? 14 : 16} />
          <span>{isDisabled ? compareT.maxReached : compareT.add}</span>
        </>
      )}
    </Button>
  )
}

interface CompareFloatingBarProps {
  language: "EN" | "KH"
  currency: "USD" | "KHR"
  onViewCompare: () => void
}

export function CompareFloatingBar({ language, currency, onViewCompare }: CompareFloatingBarProps) {
  const { compareProducts, removeFromCompare, clearCompare } = useComparison()

  const t = translations[language === "EN" ? "en" : "kh"]
  const compareT = t.compare || {
    comparing: language === "EN" ? "Comparing" : "កំពុងប្រៀបធៀប",
    products: language === "EN" ? "products" : "ផលិតផល",
    view: language === "EN" ? "View Comparison" : "មើលការប្រៀបធៀប",
    clear: language === "EN" ? "Clear" : "សម្អាត",
  }

  if (compareProducts.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in-0 duration-300">
      <div className="flex items-center gap-3 bg-card border border-border shadow-lg rounded-full px-4 py-2">
        {/* Product thumbnails */}
        <div className="flex -space-x-2">
          {compareProducts.map((product) => (
            <div
              key={product.id}
              className="relative w-10 h-10 rounded-full border-2 border-background overflow-hidden bg-muted group"
            >
              <img
                src={product.imageUrl || "/placeholder.svg"}
                alt={language === "EN" ? product.nameEn : product.nameKh}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => removeFromCompare(product.id)}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                aria-label={`Remove ${language === "EN" ? product.nameEn : product.nameKh} from compare`}
              >
                <X size={14} className="text-white" />
              </button>
            </div>
          ))}
        </div>

        {/* Count */}
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {compareProducts.length} {compareT.products}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCompare}
            className="text-muted-foreground hover:text-foreground"
          >
            {compareT.clear}
          </Button>
          <Button
            size="sm"
            onClick={onViewCompare}
            disabled={compareProducts.length < 2}
            className="bg-primary text-primary-foreground"
          >
            {compareT.view}
          </Button>
        </div>
      </div>
    </div>
  )
}
