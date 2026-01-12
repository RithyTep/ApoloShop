"use client"

import { useState, useMemo, Suspense } from "react"
import { ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useCart, useLanguage, useCurrency } from "@/lib/shop-context"
import { ShopClientWrapper } from "@/components/shop/shop-client-wrapper"
import { FilterSidebar, MobileFilterTrigger, type ProductFilters } from "@/components/filter-sidebar"
import { WishlistButton } from "@/components/wishlist-button"
import { ProductQuickView, QuickViewButton } from "@/components/product-quick-view"
import { translations } from "@/lib/i18n"
import type { Product, Category, ShopTheme } from "@/lib/api-hooks"

interface ProductsPageClientProps {
  theme: ShopTheme
  initialProducts: Product[]
  categories: Category[]
  maxPrice: number
}

function ProductsContent({
  initialProducts,
  categories,
  maxPrice,
}: Omit<ProductsPageClientProps, "theme">) {
  const { addToCart } = useCart()
  const { language } = useLanguage()
  const { currency } = useCurrency()
  const t = translations[language === "EN" ? "en" : "kh"].filters

  const [filters, setFilters] = useState<ProductFilters>({
    categories: [],
    priceMin: null,
    priceMax: null,
    sortBy: "newest",
    inStock: false,
  })
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quickViewOpen, setQuickViewOpen] = useState(false)

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...initialProducts]

    // Filter by categories
    if (filters.categories.length > 0) {
      result = result.filter((p) => filters.categories.includes(p.categoryId))
    }

    // Filter by price range (USD)
    if (filters.priceMin !== null) {
      result = result.filter((p) => Number(p.priceUsd) >= filters.priceMin!)
    }
    if (filters.priceMax !== null) {
      result = result.filter((p) => Number(p.priceUsd) <= filters.priceMax!)
    }

    // Filter by stock
    if (filters.inStock) {
      result = result.filter((p) => (p.inventory?.quantity || 0) > 0)
    }

    // Sort
    switch (filters.sortBy) {
      case "price_asc":
        result.sort((a, b) => Number(a.priceUsd) - Number(b.priceUsd))
        break
      case "price_desc":
        result.sort((a, b) => Number(b.priceUsd) - Number(a.priceUsd))
        break
      case "name_asc":
        result.sort((a, b) => {
          const nameA = language === "EN" ? a.nameEn : a.nameKh
          const nameB = language === "EN" ? b.nameEn : b.nameKh
          return nameA.localeCompare(nameB)
        })
        break
      case "name_desc":
        result.sort((a, b) => {
          const nameA = language === "EN" ? a.nameEn : a.nameKh
          const nameB = language === "EN" ? b.nameEn : b.nameKh
          return nameB.localeCompare(nameA)
        })
        break
      case "popular":
        // For now, just keep original order - could be enhanced with actual sales data
        break
      case "newest":
      default:
        // Already sorted by newest from server
        break
    }

    return result
  }, [initialProducts, filters, language])

  const openQuickView = (product: Product) => {
    setSelectedProduct(product)
    setQuickViewOpen(true)
  }

  const handleQuickViewAddToCart = (id: string, name: string, price: number, image: string, quantity: number) => {
    for (let i = 0; i < quantity; i++) {
      addToCart(id, name, price, image)
    }
  }

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.priceMin !== null ||
    filters.priceMax !== null ||
    filters.sortBy !== "newest" ||
    filters.inStock

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {language === "EN" ? "All Products" : "ផលិតផលទាំងអស់"}
          </h1>
          <p className="text-muted-foreground">
            {language === "EN"
              ? "Browse our complete collection"
              : "រកមើលបណ្តុំផលិតផលទាំងអស់របស់យើង"}
          </p>
        </div>

        {/* Mobile Filter Toggle */}
        <div className="flex items-center justify-between mb-6 lg:hidden">
          <p className="text-sm text-muted-foreground">
            {filteredProducts.length} {t.results}
          </p>
          <MobileFilterTrigger
            onClick={() => setMobileFiltersOpen(true)}
            language={language}
            hasFilters={hasActiveFilters}
          />
        </div>

        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24">
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <FilterSidebar
                  categories={categories}
                  language={language}
                  currency={currency}
                  maxPrice={maxPrice}
                  onFiltersChange={setFilters}
                  resultCount={filteredProducts.length}
                />
              </Suspense>
            </div>
          </aside>

          {/* Products Grid */}
          <main className="flex-1">
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                {filteredProducts.map((product, index) => {
                  const inStock = (product.inventory?.quantity || 0) > 0

                  return (
                    <div
                      key={product.id}
                      className="bg-card border border-border flex flex-col group animate-in fade-in-0 slide-in-from-bottom-2"
                      style={{ animationDelay: `${Math.min(index, 8) * 30}ms`, animationDuration: "300ms" }}
                    >
                      {/* Image */}
                      <div className="relative">
                        <div className="aspect-square overflow-hidden bg-muted">
                          <img
                            src={product.imageUrl || "/placeholder.svg"}
                            alt={language === "EN" ? product.nameEn : product.nameKh}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading={index < 6 ? "eager" : "lazy"}
                          />
                        </div>
                        {/* Hover overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors duration-200 pointer-events-none">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto">
                            <QuickViewButton onClick={() => openQuickView(product)} language={language} />
                          </div>
                        </div>
                        {/* Wishlist button */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <WishlistButton productId={product.id} size="sm" language={language} />
                        </div>
                        {/* Category badge */}
                        {product.category && (
                          <Badge
                            variant="secondary"
                            className="absolute top-2 left-2 text-xs"
                          >
                            {language === "EN" ? product.category.nameEn : product.category.nameKh}
                          </Badge>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-3 sm:p-4 flex flex-col flex-1">
                        <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1 line-clamp-2">
                          {language === "EN" ? product.nameEn : product.nameKh}
                        </h3>

                        <p className="text-lg sm:text-xl font-bold text-primary mb-2">
                          {currency === "USD"
                            ? `$${Number(product.priceUsd).toFixed(2)}`
                            : `${Number(product.priceKhr).toLocaleString()}៛`}
                        </p>

                        <div className="mb-2">
                          <Badge
                            variant={inStock ? "default" : "outline"}
                            className={cn(
                              "text-xs",
                              inStock
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {language === "EN"
                              ? inStock ? "In Stock" : "Out of Stock"
                              : inStock ? "មាននៅក្នុងស្តុក" : "អស់ស្តុក"}
                          </Badge>
                        </div>

                        <Button
                          onClick={() =>
                            addToCart(
                              product.id,
                              language === "EN" ? product.nameEn : product.nameKh,
                              currency === "USD" ? product.priceUsd : product.priceKhr,
                              product.imageUrl || ""
                            )
                          }
                          disabled={!inStock}
                          className="w-full mt-auto"
                          size="sm"
                        >
                          <ShoppingCart size={14} className="mr-2" />
                          {language === "EN" ? "Add to Cart" : "បន្ថែមទៅរទុក"}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-lg text-muted-foreground mb-4">{t.noResults}</p>
                <Button
                  variant="outline"
                  onClick={() => setFilters({
                    categories: [],
                    priceMin: null,
                    priceMax: null,
                    sortBy: "newest",
                    inStock: false,
                  })}
                >
                  {t.reset}
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filter Dialog */}
      <Dialog open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <DialogContent className="max-w-sm h-[80vh] overflow-y-auto">
          <DialogTitle className="sr-only">{t.title}</DialogTitle>
          <FilterSidebar
            categories={categories}
            language={language}
            currency={currency}
            maxPrice={maxPrice}
            onFiltersChange={(newFilters) => {
              setFilters(newFilters)
              setMobileFiltersOpen(false)
            }}
            resultCount={filteredProducts.length}
            className="border-0"
          />
        </DialogContent>
      </Dialog>

      {/* Quick View Modal */}
      {selectedProduct && (
        <ProductQuickView
          product={selectedProduct}
          open={quickViewOpen}
          onOpenChange={setQuickViewOpen}
          onAddToCart={handleQuickViewAddToCart}
          currency={currency}
          language={language}
        />
      )}
    </div>
  )
}

export function ProductsPageClient({
  theme,
  initialProducts,
  categories,
  maxPrice,
}: ProductsPageClientProps) {
  return (
    <ShopClientWrapper theme={theme} products={initialProducts}>
      <ProductsContent
        initialProducts={initialProducts}
        categories={categories}
        maxPrice={maxPrice}
      />
    </ShopClientWrapper>
  )
}
