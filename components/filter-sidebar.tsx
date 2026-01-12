"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronDown, X, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { translations } from "@/lib/i18n"
import type { Category } from "@/lib/api-hooks"

export type SortOption = "newest" | "price_asc" | "price_desc" | "popular" | "name_asc" | "name_desc"

export interface ProductFilters {
  categories: string[]
  priceMin: number | null
  priceMax: number | null
  sortBy: SortOption
  inStock: boolean
}

interface FilterSidebarProps {
  categories: Category[]
  language: "EN" | "KH"
  currency: "USD" | "KHR"
  maxPrice?: number
  onFiltersChange: (filters: ProductFilters) => void
  resultCount?: number
  className?: string
}

const defaultFilters: ProductFilters = {
  categories: [],
  priceMin: null,
  priceMax: null,
  sortBy: "newest",
  inStock: false,
}

export function FilterSidebar({
  categories,
  language,
  currency,
  maxPrice = 100,
  onFiltersChange,
  resultCount,
  className,
}: FilterSidebarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = translations[language === "EN" ? "en" : "kh"].filters

  // Parse filters from URL on mount
  const [filters, setFilters] = useState<ProductFilters>(() => {
    const cats = searchParams.get("categories")
    const minPrice = searchParams.get("minPrice")
    const maxPriceParam = searchParams.get("maxPrice")
    const sort = searchParams.get("sort") as SortOption | null
    const inStock = searchParams.get("inStock")

    return {
      categories: cats ? cats.split(",") : [],
      priceMin: minPrice ? Number(minPrice) : null,
      priceMax: maxPriceParam ? Number(maxPriceParam) : null,
      sortBy: sort || "newest",
      inStock: inStock === "true",
    }
  })

  // Collapsible section states
  const [priceOpen, setPriceOpen] = useState(true)
  const [categoriesOpen, setCategoriesOpen] = useState(true)
  const [sortOpen, setSortOpen] = useState(true)

  // Slider values for price range
  const [priceRange, setPriceRange] = useState<[number, number]>([
    filters.priceMin ?? 0,
    filters.priceMax ?? maxPrice,
  ])

  // Sync URL params to state
  const syncToUrl = useCallback((newFilters: ProductFilters) => {
    const params = new URLSearchParams()

    if (newFilters.categories.length > 0) {
      params.set("categories", newFilters.categories.join(","))
    }
    if (newFilters.priceMin !== null && newFilters.priceMin > 0) {
      params.set("minPrice", newFilters.priceMin.toString())
    }
    if (newFilters.priceMax !== null && newFilters.priceMax < maxPrice) {
      params.set("maxPrice", newFilters.priceMax.toString())
    }
    if (newFilters.sortBy !== "newest") {
      params.set("sort", newFilters.sortBy)
    }
    if (newFilters.inStock) {
      params.set("inStock", "true")
    }

    const queryString = params.toString()
    router.push(queryString ? `?${queryString}` : window.location.pathname, { scroll: false })
  }, [router, maxPrice])

  // Update filters and notify parent
  const updateFilters = useCallback((newFilters: ProductFilters) => {
    setFilters(newFilters)
    onFiltersChange(newFilters)
    syncToUrl(newFilters)
  }, [onFiltersChange, syncToUrl])

  // Notify parent on initial load
  useEffect(() => {
    onFiltersChange(filters)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle category toggle
  const toggleCategory = (categoryId: string) => {
    const newCategories = filters.categories.includes(categoryId)
      ? filters.categories.filter(c => c !== categoryId)
      : [...filters.categories, categoryId]

    updateFilters({ ...filters, categories: newCategories })
  }

  // Handle price range change (on slider release)
  const handlePriceChange = (values: number[]) => {
    setPriceRange([values[0], values[1]])
  }

  const handlePriceCommit = () => {
    updateFilters({
      ...filters,
      priceMin: priceRange[0] > 0 ? priceRange[0] : null,
      priceMax: priceRange[1] < maxPrice ? priceRange[1] : null,
    })
  }

  // Handle sort change
  const handleSortChange = (value: SortOption) => {
    updateFilters({ ...filters, sortBy: value })
  }

  // Handle in-stock toggle
  const handleInStockChange = (checked: boolean) => {
    updateFilters({ ...filters, inStock: checked })
  }

  // Clear all filters
  const clearFilters = () => {
    setPriceRange([0, maxPrice])
    updateFilters(defaultFilters)
  }

  // Check if any filters are active
  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.priceMin !== null ||
    filters.priceMax !== null ||
    filters.sortBy !== "newest" ||
    filters.inStock

  // Format price for display
  const formatPrice = (value: number) => {
    if (currency === "USD") {
      return `$${value}`
    }
    return `${(value * 4000).toLocaleString()}៛`
  }

  return (
    <div className={cn("bg-card border border-border rounded-lg p-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5" />
          <h2 className="font-semibold text-lg">{t.title}</h2>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            {t.clearAll}
          </Button>
        )}
      </div>

      {/* Results count */}
      {resultCount !== undefined && (
        <p className="text-sm text-muted-foreground mb-4">
          {resultCount} {t.results}
        </p>
      )}

      {/* Sort By */}
      <Collapsible open={sortOpen} onOpenChange={setSortOpen} className="mb-4">
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium">
          {t.sortBy}
          <ChevronDown className={cn("w-4 h-4 transition-transform", sortOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <Select value={filters.sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t.sortOptions.newest}</SelectItem>
              <SelectItem value="price_asc">{t.sortOptions.priceLowHigh}</SelectItem>
              <SelectItem value="price_desc">{t.sortOptions.priceHighLow}</SelectItem>
              <SelectItem value="popular">{t.sortOptions.popular}</SelectItem>
              <SelectItem value="name_asc">{t.sortOptions.nameAZ}</SelectItem>
              <SelectItem value="name_desc">{t.sortOptions.nameZA}</SelectItem>
            </SelectContent>
          </Select>
        </CollapsibleContent>
      </Collapsible>

      {/* Price Range */}
      <Collapsible open={priceOpen} onOpenChange={setPriceOpen} className="mb-4">
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium">
          {t.priceRange}
          <ChevronDown className={cn("w-4 h-4 transition-transform", priceOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-4">
          <Slider
            value={priceRange}
            min={0}
            max={maxPrice}
            step={1}
            onValueChange={handlePriceChange}
            onValueCommit={handlePriceCommit}
            className="w-full"
          />
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">{t.min}</Label>
              <Input
                type="number"
                value={priceRange[0]}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(Number(e.target.value), priceRange[1]))
                  setPriceRange([val, priceRange[1]])
                }}
                onBlur={handlePriceCommit}
                className="h-8 text-sm"
                min={0}
                max={priceRange[1]}
              />
            </div>
            <span className="text-muted-foreground mt-4">-</span>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">{t.max}</Label>
              <Input
                type="number"
                value={priceRange[1]}
                onChange={(e) => {
                  const val = Math.min(maxPrice, Math.max(Number(e.target.value), priceRange[0]))
                  setPriceRange([priceRange[0], val])
                }}
                onBlur={handlePriceCommit}
                className="h-8 text-sm"
                min={priceRange[0]}
                max={maxPrice}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
          </p>
        </CollapsibleContent>
      </Collapsible>

      {/* Categories */}
      <Collapsible open={categoriesOpen} onOpenChange={setCategoriesOpen} className="mb-4">
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium">
          {t.categories}
          <ChevronDown className={cn("w-4 h-4 transition-transform", categoriesOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center space-x-2">
              <Checkbox
                id={`cat-${category.id}`}
                checked={filters.categories.includes(category.id)}
                onCheckedChange={() => toggleCategory(category.id)}
              />
              <Label
                htmlFor={`cat-${category.id}`}
                className="text-sm font-normal cursor-pointer flex-1"
              >
                {language === "EN" ? category.nameEn : category.nameKh}
              </Label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* In Stock Only */}
      <div className="flex items-center space-x-2 py-2 border-t border-border">
        <Checkbox
          id="in-stock"
          checked={filters.inStock}
          onCheckedChange={handleInStockChange}
        />
        <Label htmlFor="in-stock" className="text-sm font-normal cursor-pointer">
          {t.inStock}
        </Label>
      </div>
    </div>
  )
}

// Mobile filter drawer trigger
export function MobileFilterTrigger({
  onClick,
  language,
  hasFilters
}: {
  onClick: () => void
  language: "EN" | "KH"
  hasFilters?: boolean
}) {
  const t = translations[language === "EN" ? "en" : "kh"].filters

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="lg:hidden relative"
    >
      <SlidersHorizontal className="w-4 h-4 mr-2" />
      {t.title}
      {hasFilters && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
      )}
    </Button>
  )
}
