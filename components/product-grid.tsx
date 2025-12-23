"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart } from "phosphor-react"

interface Product {
  id: string
  name: string
  nameKH: string
  price: number
  priceKHR: number
  image: string
  inStock: boolean
}

const PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Coffee Blend",
    nameKH: "សមាសធាតុកាហ្វេ",
    price: 5.99,
    priceKHR: 24000,
    image: "/coffee-beans-package.png",
    inStock: true,
  },
  {
    id: "2",
    name: "Iced Coffee",
    nameKH: "កាហ្វេត្រជាក់",
    price: 3.49,
    priceKHR: 14000,
    image: "/iced-coffee.png",
    inStock: true,
  },
  {
    id: "3",
    name: "Croissant",
    nameKH: "ខ្នាប់របូប",
    price: 2.99,
    priceKHR: 12000,
    image: "/golden-croissant.png",
    inStock: true,
  },
  {
    id: "4",
    name: "Cookies",
    nameKH: "សឺគូគី",
    price: 4.49,
    priceKHR: 18000,
    image: "/chocolate-chip-cookies.png",
    inStock: false,
  },
  {
    id: "5",
    name: "Tea Set",
    nameKH: "សំណុំតែ",
    price: 12.99,
    priceKHR: 52000,
    image: "/tea-set-ceramic.jpg",
    inStock: true,
  },
  {
    id: "6",
    name: "Pastry Box",
    nameKH: "ប្រអប់មាន់នី",
    price: 8.99,
    priceKHR: 36000,
    image: "/pastry-assortment-box.jpg",
    inStock: true,
  },
]

interface ProductGridProps {
  onAddToCart: (id: string, name: string, price: number, image: string) => void
  currency: "USD" | "KHR"
  language: "EN" | "KH"
}

export function ProductGrid({ onAddToCart, currency, language }: ProductGridProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {language === "EN" ? "Our Products" : "ផលិតផលរបស់យើង"}
        </h1>
        <p className="text-muted-foreground">
          {language === "EN" ? "Fresh and delicious products crafted with care" : "ផលិតផលស្វាយ់ហើយឆ្ងាវៗដែលធ្វើឡើងដោយស្នេហា"}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {PRODUCTS.map((product) => (
          <div key={product.id} className="bg-card border border-border flex flex-col">
            {/* Image */}
            <div className="aspect-square overflow-hidden bg-muted">
              <img
                src={product.image || "/placeholder.svg"}
                alt={product.name}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* Content */}
            <div className="p-3 sm:p-4 flex flex-col flex-1">
              <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1">
                {language === "EN" ? product.name : product.nameKH}
              </h3>

              {/* Price */}
              <p className="text-lg sm:text-xl font-bold text-primary mb-3">
                {currency === "USD" ? `$${product.price}` : `${product.priceKHR}៛`}
              </p>

              {/* Stock Badge */}
              <div className="mb-3">
                <Badge
                  variant={product.inStock ? "default" : "outline"}
                  className={`text-xs sm:text-sm ${
                    product.inStock ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {language === "EN"
                    ? product.inStock
                      ? "In Stock"
                      : "Out of Stock"
                    : product.inStock
                      ? "មាននៅក្នុងស្តុក"
                      : "អស់ស្តុក"}
                </Badge>
              </div>

              {/* Add to Cart Button */}
              <Button
                onClick={() => onAddToCart(product.id, product.name, product.price, product.image)}
                disabled={!product.inStock}
                className="w-full bg-primary text-primary-foreground hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-auto"
              >
                <ShoppingCart size={16} />
                <span className="text-sm sm:text-base">{language === "EN" ? "Add to Cart" : "បន្ថែមទៅរទុក"}</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
