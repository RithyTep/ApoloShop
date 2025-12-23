"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OrderStatusNotification } from "@/components/order-status-notification"
import { CustomerOrderHistory } from "@/components/customer-order-history"
import { KitchenOrderScreen } from "@/components/kitchen-order-screen"
import { ReceiptInvoice } from "@/components/receipt-invoice"
import type { Language } from "@/lib/i18n"
import { Button } from "@/components/ui/button"

export default function Page() {
  const [language, setLanguage] = useState<Language>("en")

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-pink-600">Shop CMS - Advanced Features</h1>
        <Button
          onClick={() => setLanguage(language === "en" ? "kh" : "en")}
          variant="outline"
          aria-label={language === "en" ? "Switch to Khmer" : "Switch to English"}
        >
          {language === "en" ? "ខ្មែរ" : "English"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="p-6">
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white border">
            <TabsTrigger value="orders">Order Notifications</TabsTrigger>
            <TabsTrigger value="customers">Customer History</TabsTrigger>
            <TabsTrigger value="kitchen">Kitchen Screen</TabsTrigger>
            <TabsTrigger value="receipt">Receipt / Invoice</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-6">
            <OrderStatusNotification language={language} />
          </TabsContent>

          <TabsContent value="customers" className="mt-6">
            <CustomerOrderHistory language={language} />
          </TabsContent>

          <TabsContent value="kitchen" className="mt-6">
            <KitchenOrderScreen language={language} />
          </TabsContent>

          <TabsContent value="receipt" className="mt-6 flex justify-center">
            <ReceiptInvoice language={language} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
