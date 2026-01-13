"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, ShoppingCart, Check, Minus, Share2, Link2, Copy } from "lucide-react"
import { Product } from "@/lib/api-hooks"
import { useComparison } from "@/lib/comparison-context"
import { cn } from "@/lib/utils"
import { translations } from "@/lib/i18n"
import { useState } from "react"

interface ComparisonTableProps {
  products: Product[]
  language: "EN" | "KH"
  currency: "USD" | "KHR"
  onAddToCart: (id: string, name: string, price: number, image: string) => void
  onProductClick?: (productId: string) => void
}

export function ComparisonTable({
  products,
  language,
  currency,
  onAddToCart,
  onProductClick,
}: ComparisonTableProps) {
  const { removeFromCompare, getShareableUrl, clearCompare } = useComparison()
  const [copied, setCopied] = useState(false)

  const t = translations[language === "EN" ? "en" : "kh"]
  const compareT = t.compare || {
    title: language === "EN" ? "Product Comparison" : "ការប្រៀបធៀបផលិតផល",
    name: language === "EN" ? "Product Name" : "ឈ្មោះផលិតផល",
    price: language === "EN" ? "Price" : "តម្លៃ",
    category: language === "EN" ? "Category" : "ប្រភេទ",
    stock: language === "EN" ? "Stock Status" : "ស្ថានភាពស្តុក",
    description: language === "EN" ? "Description" : "ការពិពណ៌នា",
    sku: language === "EN" ? "SKU" : "SKU",
    inStock: language === "EN" ? "In Stock" : "មាននៅក្នុងស្តុក",
    outOfStock: language === "EN" ? "Out of Stock" : "អស់ស្តុក",
    addToCart: language === "EN" ? "Add to Cart" : "បន្ថែមទៅរទុក",
    remove: language === "EN" ? "Remove" : "ដកចេញ",
    share: language === "EN" ? "Share Comparison" : "ចែករំលែកការប្រៀបធៀប",
    copied: language === "EN" ? "Link copied!" : "បានចម្លងតំណ!",
    clearAll: language === "EN" ? "Clear All" : "សម្អាតទាំងអស់",
    noProducts: language === "EN" ? "Add products to compare" : "បន្ថែមផលិតផលដើម្បីប្រៀបធៀប",
  }

  const handleShare = async () => {
    const url = getShareableUrl()
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input")
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand("copy")
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (products.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="py-12 text-center text-muted-foreground">
          {compareT.noProducts}
        </CardContent>
      </Card>
    )
  }

  // Helper to check if values differ across products
  const valuesDiffer = (getValue: (p: Product) => string | number | undefined) => {
    const values = products.map(getValue).filter((v) => v !== undefined)
    return new Set(values).size > 1
  }

  const formatPrice = (priceUsd: number, priceKhr: number) => {
    return currency === "USD"
      ? `$${Number(priceUsd).toFixed(2)}`
      : `${Number(priceKhr).toLocaleString()}៛`
  }

  // Specification rows configuration
  const specRows = [
    {
      label: compareT.price,
      getValue: (p: Product) =>
        formatPrice(Number(p.priceUsd), Number(p.priceKhr)),
      highlight: valuesDiffer((p) => Number(p.priceUsd)),
    },
    {
      label: compareT.category,
      getValue: (p: Product) =>
        p.category
          ? language === "EN"
            ? p.category.nameEn
            : p.category.nameKh
          : "-",
      highlight: valuesDiffer((p) => p.category?.id),
    },
    {
      label: compareT.stock,
      getValue: (p: Product) => {
        const inStock = (p.inventory?.quantity || 0) > 0
        return inStock ? compareT.inStock : compareT.outOfStock
      },
      renderCell: (p: Product) => {
        const inStock = (p.inventory?.quantity || 0) > 0
        return (
          <Badge
            variant={inStock ? "default" : "outline"}
            className={cn(
              inStock
                ? "bg-green-500/10 text-green-700 border-green-500/20"
                : "bg-red-500/10 text-red-700 border-red-500/20"
            )}
          >
            {inStock ? (
              <Check size={12} className="mr-1" />
            ) : (
              <Minus size={12} className="mr-1" />
            )}
            {inStock ? compareT.inStock : compareT.outOfStock}
          </Badge>
        )
      },
      highlight: valuesDiffer((p) => (p.inventory?.quantity || 0) > 0 ? "yes" : "no"),
    },
    {
      label: compareT.sku,
      getValue: (p: Product) => p.sku || "-",
      highlight: false,
    },
    {
      label: compareT.description,
      getValue: (p: Product) =>
        (language === "EN" ? p.descriptionEn : p.descriptionKh) || "-",
      highlight: false,
      truncate: true,
    },
  ]

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{compareT.title}</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check size={14} />
                {compareT.copied}
              </>
            ) : (
              <>
                <Link2 size={14} />
                {compareT.share}
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCompare}
            className="text-muted-foreground"
          >
            {compareT.clearAll}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              {/* Product images row */}
              <tr className="border-b">
                <th className="p-4 text-left font-medium text-muted-foreground w-40">
                  {compareT.name}
                </th>
                {products.map((product) => (
                  <th key={product.id} className="p-4 text-center relative">
                    {/* Remove button */}
                    <button
                      onClick={() => removeFromCompare(product.id)}
                      className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
                      aria-label={`${compareT.remove} ${language === "EN" ? product.nameEn : product.nameKh}`}
                    >
                      <X size={16} className="text-muted-foreground" />
                    </button>

                    {/* Product image */}
                    <div
                      className="w-24 h-24 mx-auto mb-3 rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => onProductClick?.(product.id)}
                    >
                      <img
                        src={product.imageUrl || "/placeholder.svg"}
                        alt={language === "EN" ? product.nameEn : product.nameKh}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Product name */}
                    <p
                      className="font-semibold text-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                      onClick={() => onProductClick?.(product.id)}
                    >
                      {language === "EN" ? product.nameEn : product.nameKh}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {specRows.map((row, idx) => (
                <tr
                  key={row.label}
                  className={cn(
                    "border-b last:border-b-0",
                    row.highlight && "bg-primary/5"
                  )}
                >
                  <td className="p-4 text-left font-medium text-muted-foreground">
                    {row.label}
                    {row.highlight && (
                      <span className="ml-2 text-xs text-primary">*</span>
                    )}
                  </td>
                  {products.map((product) => (
                    <td
                      key={product.id}
                      className={cn(
                        "p-4 text-center",
                        row.truncate && "max-w-[200px]"
                      )}
                    >
                      {row.renderCell ? (
                        row.renderCell(product)
                      ) : (
                        <span className={cn(row.truncate && "line-clamp-3")}>
                          {row.getValue(product)}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Add to cart row */}
              <tr className="bg-muted/50">
                <td className="p-4"></td>
                {products.map((product) => {
                  const inStock = (product.inventory?.quantity || 0) > 0
                  const displayPrice =
                    currency === "USD"
                      ? Number(product.priceUsd)
                      : Number(product.priceKhr)
                  return (
                    <td key={product.id} className="p-4 text-center">
                      <Button
                        onClick={() =>
                          onAddToCart(
                            product.id,
                            product.nameEn,
                            Number(product.priceUsd),
                            product.imageUrl || ""
                          )
                        }
                        disabled={!inStock}
                        className="w-full max-w-[150px] gap-2"
                      >
                        <ShoppingCart size={16} />
                        {compareT.addToCart}
                      </Button>
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="px-4 py-3 border-t bg-muted/30 text-xs text-muted-foreground">
          <span className="text-primary">*</span>{" "}
          {language === "EN"
            ? "Highlighted rows show differences between products"
            : "ជួរដែលបានបញ្ជាក់បង្ហាញពីភាពខុសគ្នារវាងផលិតផល"}
        </div>
      </CardContent>
    </Card>
  )
}
