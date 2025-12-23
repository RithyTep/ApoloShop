"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingBag, Settings, Coffee } from "lucide-react"

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Logo & Title */}
        <div className="text-center mb-12">
          <div className="mx-auto mb-6 w-20 h-20 bg-pink-600 rounded-full flex items-center justify-center">
            <Coffee className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">ApoloShop</h1>
          <p className="text-gray-600 text-lg">E-commerce CMS for Cambodian Small Businesses</p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                <ShoppingBag className="w-6 h-6 text-pink-600" />
              </div>
              <CardTitle>Shop</CardTitle>
              <CardDescription>
                Browse products and place orders via Telegram or Messenger
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/shop">
                <Button className="w-full bg-pink-600 hover:bg-pink-700">
                  Visit Shop
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Settings className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle>Admin Dashboard</CardTitle>
              <CardDescription>
                Manage products, orders, customers, and settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin">
                <Button variant="outline" className="w-full">
                  Go to Admin
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-gray-500">
          <p>Multi-language (EN/KH) | Multi-currency (USD/KHR) | KHQR Payments</p>
        </div>
      </div>
    </div>
  )
}
