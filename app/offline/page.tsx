"use client"

import { useState, useEffect } from "react"
import { WifiOff, RefreshCcw, Package, ShoppingBag, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

interface CachedProduct {
  id: string
  nameEn: string
  nameKh: string
  priceUsd: number
  priceKhr: number
  imageUrl?: string
  descriptionEn?: string
  descriptionKh?: string
}

export default function OfflinePage() {
  const [cachedProducts, setCachedProducts] = useState<CachedProduct[]>([])
  const [isOnline, setIsOnline] = useState(false)
  const [language, setLanguage] = useState<"EN" | "KH">("EN")

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Load language preference
    const savedLang = localStorage.getItem("apoloshop-language")
    if (savedLang === "KH") {
      setLanguage("KH")
    }

    // Load cached products from service worker cache
    loadCachedProducts()

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const loadCachedProducts = async () => {
    try {
      // Try to get products from cache
      const cache = await caches.open("apoloshop-products-v1")
      const keys = await cache.keys()

      const products: CachedProduct[] = []
      for (const request of keys) {
        if (request.url.includes("/api/products/") && !request.url.includes("search")) {
          try {
            const response = await cache.match(request)
            if (response) {
              const product = await response.json()
              products.push(product)
            }
          } catch (e) {
            // Skip invalid cache entries
          }
        }
      }

      setCachedProducts(products)
    } catch (e) {
      console.error("Failed to load cached products:", e)
    }
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  const formatPrice = (usd: number, khr: number) => {
    if (language === "KH") {
      return `${khr.toLocaleString()} KHR`
    }
    return `$${usd.toFixed(2)}`
  }

  const t = {
    EN: {
      title: "You're Offline",
      subtitle: "It looks like you've lost your internet connection",
      tryAgain: "Try Again",
      goHome: "Go Home",
      cachedProducts: "Recently Viewed Products",
      cachedDescription: "These products are available offline from your recent browsing",
      noProducts: "No cached products available",
      noCachedDescription: "Browse products while online to see them here when offline",
      connectionRestored: "Connection Restored!",
      connectionRestoredDescription: "Your internet connection has been restored",
      viewProduct: "View Details",
    },
    KH: {
      title: "អ្នកកំពុងអហ្វឡាញ",
      subtitle: "វាហាក់ដូចជាអ្នកបានបាត់បង់ការតភ្ជាប់អ៊ីនធឺណិត",
      tryAgain: "ព្យាយាមម្តងទៀត",
      goHome: "ទៅទំព័រដើម",
      cachedProducts: "ផលិតផលដែលបានមើលថ្មីៗ",
      cachedDescription: "ផលិតផលទាំងនេះមានជាអហ្វឡាញពីការរុករករបស់អ្នកថ្មីៗ",
      noProducts: "គ្មានផលិតផលដែលបានរក្សាទុក",
      noCachedDescription: "រុករកផលិតផលខណៈពេលអនឡាញដើម្បីមើលវានៅទីនេះពេលអហ្វឡាញ",
      connectionRestored: "ការតភ្ជាប់បានស្ដារឡើងវិញ!",
      connectionRestoredDescription: "ការតភ្ជាប់អ៊ីនធឺណិតរបស់អ្នកបានស្ដារឡើងវិញ",
      viewProduct: "មើលលម្អិត",
    },
  }

  const texts = t[language]

  if (isOnline) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-green-50 to-white">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <WifiOff className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{texts.connectionRestored}</h1>
          <p className="text-gray-600 mb-8">{texts.connectionRestoredDescription}</p>
          <div className="flex gap-4 justify-center">
            <Button onClick={handleRefresh} variant="default">
              <RefreshCcw className="h-4 w-4 mr-2" />
              {texts.tryAgain}
            </Button>
            <Link href="/shop">
              <Button variant="outline">
                <Home className="h-4 w-4 mr-2" />
                {texts.goHome}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Offline banner */}
      <div className="bg-orange-500 text-white px-4 py-3 flex items-center justify-center gap-2">
        <WifiOff className="h-5 w-5" />
        <span className="font-medium">{texts.title}</span>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Main offline message */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <WifiOff className="h-12 w-12 text-gray-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{texts.title}</h1>
          <p className="text-gray-600 max-w-md mx-auto mb-6">{texts.subtitle}</p>
          <div className="flex gap-4 justify-center">
            <Button onClick={handleRefresh} variant="default">
              <RefreshCcw className="h-4 w-4 mr-2" />
              {texts.tryAgain}
            </Button>
            <Link href="/shop">
              <Button variant="outline">
                <Home className="h-4 w-4 mr-2" />
                {texts.goHome}
              </Button>
            </Link>
          </div>
        </div>

        {/* Cached products section */}
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Package className="h-6 w-6 text-gray-700" />
            <h2 className="text-xl font-semibold text-gray-900">{texts.cachedProducts}</h2>
          </div>
          <p className="text-gray-600 mb-6">{texts.cachedDescription}</p>

          {cachedProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {cachedProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  <div className="aspect-square bg-gray-100 relative">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={language === "KH" ? product.nameKh : product.nameEn}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="h-12 w-12 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded">
                      Offline
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1">
                      {language === "KH" ? product.nameKh : product.nameEn}
                    </h3>
                    <p className="text-sm font-semibold text-primary">
                      {formatPrice(product.priceUsd, product.priceKhr)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">{texts.noProducts}</h3>
              <p className="text-sm text-gray-500">{texts.noCachedDescription}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
