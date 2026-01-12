"use client"

import { useState, useMemo, useEffect } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"

// Variant type definition
export interface ProductVariant {
  id: string
  sku: string
  options: Record<string, string> // { size: "M", color: "Red" }
  priceUsd: number | null
  priceKhr: number | null
  stock: number
  imageUrl: string | null
  sortOrder: number
  isActive: boolean
}

// Option values derived from variants
interface OptionValue {
  value: string
  available: boolean // Whether this option is available with current selections
  imageUrl?: string | null // For color swatches
}

interface VariantSelectorProps {
  variants: ProductVariant[]
  variantTypes: string[] // e.g., ["size", "color", "material"]
  basePrice: { usd: number; khr: number }
  language?: "EN" | "KH"
  currency?: "USD" | "KHR"
  onVariantSelect?: (variant: ProductVariant | null, selections: Record<string, string>) => void
  className?: string
}

// Labels for variant types in both languages
const variantTypeLabels: Record<string, { en: string; kh: string }> = {
  size: { en: "Size", kh: "ទំហំ" },
  color: { en: "Color", kh: "ពណ៌" },
  material: { en: "Material", kh: "សម្ភារ" },
  style: { en: "Style", kh: "រចនាប័ទ្ម" },
  pattern: { en: "Pattern", kh: "លំនាំ" },
  weight: { en: "Weight", kh: "ទម្ងន់" },
  flavor: { en: "Flavor", kh: "រសជាតិ" },
  scent: { en: "Scent", kh: "ក្លិន" },
}

// Common color name to CSS color mapping
const colorMap: Record<string, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  black: "#171717",
  white: "#ffffff",
  gray: "#6b7280",
  grey: "#6b7280",
  pink: "#ec4899",
  purple: "#a855f7",
  orange: "#f97316",
  brown: "#92400e",
  navy: "#1e3a5a",
  beige: "#d4b896",
  cream: "#fffdd0",
  gold: "#ffd700",
  silver: "#c0c0c0",
  teal: "#14b8a6",
  coral: "#ff7f50",
  burgundy: "#800020",
  olive: "#808000",
  maroon: "#800000",
  cyan: "#06b6d4",
  magenta: "#d946ef",
  lime: "#84cc16",
  indigo: "#6366f1",
  violet: "#8b5cf6",
  rose: "#f43f5e",
  sky: "#0ea5e9",
  emerald: "#10b981",
  amber: "#f59e0b",
  slate: "#64748b",
  zinc: "#71717a",
  stone: "#78716c",
  neutral: "#737373",
}

// Check if a value is a color name
function getColorHex(colorName: string): string | null {
  const normalized = colorName.toLowerCase().trim()
  return colorMap[normalized] || null
}

export function VariantSelector({
  variants,
  variantTypes,
  basePrice,
  language = "EN",
  currency = "USD",
  onVariantSelect,
  className,
}: VariantSelectorProps) {
  // Track selected options for each variant type
  const [selections, setSelections] = useState<Record<string, string>>({})

  // Get all possible values for each variant type
  const optionsByType = useMemo(() => {
    const options: Record<string, Set<string>> = {}

    variantTypes.forEach((type) => {
      options[type] = new Set()
    })

    variants.filter(v => v.isActive).forEach((variant) => {
      Object.entries(variant.options).forEach(([type, value]) => {
        if (options[type]) {
          options[type].add(value)
        }
      })
    })

    return options
  }, [variants, variantTypes])

  // Determine which option values are available based on current selections
  const getAvailableOptions = useMemo(() => {
    const available: Record<string, OptionValue[]> = {}

    variantTypes.forEach((type) => {
      const values = Array.from(optionsByType[type] || [])

      available[type] = values.map((value) => {
        // Check if this option is available given other selections
        const testSelections = { ...selections, [type]: value }

        // Find variants that match all the test selections
        const matchingVariants = variants.filter((variant) => {
          if (!variant.isActive) return false
          return Object.entries(testSelections).every(([selType, selValue]) => {
            return variant.options[selType] === selValue
          })
        })

        // Find image URL for this option (useful for colors)
        const variantWithImage = variants.find(
          (v) => v.isActive && v.options[type] === value && v.imageUrl
        )

        return {
          value,
          available: matchingVariants.length > 0 && matchingVariants.some(v => v.stock > 0),
          imageUrl: variantWithImage?.imageUrl,
        }
      })
    })

    return available
  }, [variants, variantTypes, selections, optionsByType])

  // Find the selected variant based on all selections
  const selectedVariant = useMemo(() => {
    if (Object.keys(selections).length !== variantTypes.length) {
      return null
    }

    return variants.find((variant) => {
      if (!variant.isActive) return false
      return variantTypes.every((type) => variant.options[type] === selections[type])
    }) || null
  }, [variants, variantTypes, selections])

  // Notify parent of selection changes
  useEffect(() => {
    onVariantSelect?.(selectedVariant, selections)
  }, [selectedVariant, selections, onVariantSelect])

  // Handle option selection
  const handleSelect = (type: string, value: string) => {
    setSelections((prev) => ({
      ...prev,
      [type]: prev[type] === value ? prev[type] : value, // Don't deselect on double-click
    }))
  }

  // Get label for variant type
  const getTypeLabel = (type: string) => {
    const labels = variantTypeLabels[type.toLowerCase()]
    if (labels) {
      return language === "EN" ? labels.en : labels.kh
    }
    // Capitalize first letter for custom types
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  // Format price difference
  const formatPriceDiff = (variant: ProductVariant) => {
    if (!variant.priceUsd && !variant.priceKhr) return null

    const variantPrice = currency === "USD"
      ? (variant.priceUsd || basePrice.usd)
      : (variant.priceKhr || basePrice.khr)
    const base = currency === "USD" ? basePrice.usd : basePrice.khr
    const diff = variantPrice - base

    if (diff === 0) return null

    if (currency === "USD") {
      return diff > 0 ? `+$${diff.toFixed(2)}` : `-$${Math.abs(diff).toFixed(2)}`
    }
    return diff > 0 ? `+${diff.toLocaleString()}៛` : `-${Math.abs(diff).toLocaleString()}៛`
  }

  if (variants.length === 0 || variantTypes.length === 0) {
    return null
  }

  return (
    <div className={cn("space-y-4", className)}>
      {variantTypes.map((type) => {
        const options = getAvailableOptions[type] || []
        const isColorType = type.toLowerCase() === "color"

        return (
          <div key={type} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {getTypeLabel(type)}:
              </span>
              {selections[type] && (
                <span className="text-sm text-muted-foreground">
                  {selections[type]}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {options.map(({ value, available, imageUrl }) => {
                const isSelected = selections[type] === value
                const colorHex = isColorType ? getColorHex(value) : null

                // Color swatch button
                if (isColorType && (colorHex || imageUrl)) {
                  return (
                    <button
                      key={value}
                      onClick={() => handleSelect(type, value)}
                      disabled={!available}
                      className={cn(
                        "relative w-10 h-10 rounded-full border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                        isSelected
                          ? "border-primary ring-2 ring-primary ring-offset-2"
                          : "border-border hover:border-primary/50",
                        !available && "opacity-40 cursor-not-allowed"
                      )}
                      title={value}
                      aria-label={`${value}${!available ? " (out of stock)" : ""}`}
                    >
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={value}
                          fill
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <span
                          className="absolute inset-1 rounded-full"
                          style={{ backgroundColor: colorHex || "#ccc" }}
                        />
                      )}
                      {isSelected && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <Check
                            className={cn(
                              "h-5 w-5",
                              colorHex === "#ffffff" || colorHex === "#fffdd0"
                                ? "text-gray-800"
                                : "text-white"
                            )}
                          />
                        </span>
                      )}
                      {!available && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="w-full h-0.5 bg-muted-foreground rotate-45 absolute" />
                        </span>
                      )}
                    </button>
                  )
                }

                // Regular text button for sizes, materials, etc.
                return (
                  <button
                    key={value}
                    onClick={() => handleSelect(type, value)}
                    disabled={!available}
                    className={cn(
                      "px-4 py-2 text-sm font-medium rounded-md border transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted",
                      !available && "opacity-40 cursor-not-allowed line-through"
                    )}
                    aria-label={`${value}${!available ? " (out of stock)" : ""}`}
                  >
                    {value}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Selected variant info */}
      {selectedVariant && (
        <div className="pt-2 space-y-1">
          {selectedVariant.stock > 0 ? (
            <Badge variant="outline" className="text-success border-success">
              {selectedVariant.stock} {language === "EN" ? "in stock" : "នៅក្នុងស្តុក"}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-destructive border-destructive">
              {language === "EN" ? "Out of stock" : "អស់ស្តុក"}
            </Badge>
          )}
          {formatPriceDiff(selectedVariant) && (
            <p className="text-sm text-muted-foreground">
              {formatPriceDiff(selectedVariant)} {language === "EN" ? "from base price" : "ពីតម្លៃមូលដ្ឋាន"}
            </p>
          )}
        </div>
      )}

      {/* Prompt to select all options */}
      {!selectedVariant && Object.keys(selections).length < variantTypes.length && (
        <p className="text-sm text-muted-foreground">
          {language === "EN"
            ? `Please select ${variantTypes.filter(t => !selections[t]).join(", ")}`
            : `សូមជ្រើសរើស ${variantTypes.filter(t => !selections[t]).map(getTypeLabel).join(", ")}`
          }
        </p>
      )}
    </div>
  )
}
