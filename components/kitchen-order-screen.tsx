"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { translations, type Language } from "@/lib/i18n"

interface OrderItem {
  id: string
  name: string
  quantity: number
  notes: string
}

interface KitchenOrder {
  id: string
  status: "new" | "preparing" | "completed"
  items: OrderItem[]
  createdAt: Date
  customerPhone: string
}

interface KitchenOrderScreenProps {
  language?: Language
}

export function KitchenOrderScreen({ language = "en" }: KitchenOrderScreenProps) {
  const [orders, setOrders] = useState<KitchenOrder[]>([
    {
      id: "ORD-001",
      status: "new",
      customerPhone: "+855 12 345 678",
      items: [
        { id: "1", name: "Iced Latte", quantity: 2, notes: "No sugar" },
        { id: "2", name: "Pastry", quantity: 1, notes: "" },
      ],
      createdAt: new Date(Date.now() - 5 * 60000),
    },
    {
      id: "ORD-002",
      status: "new",
      customerPhone: "+855 98 765 432",
      items: [{ id: "1", name: "Cappuccino", quantity: 1, notes: "Extra hot" }],
      createdAt: new Date(Date.now() - 2 * 60000),
    },
    {
      id: "ORD-003",
      status: "preparing",
      customerPhone: "+855 55 555 555",
      items: [
        { id: "1", name: "Espresso", quantity: 3, notes: "" },
        { id: "2", name: "Iced Coffee", quantity: 2, notes: "Light ice" },
      ],
      createdAt: new Date(Date.now() - 10 * 60000),
    },
  ])

  const t = translations[language]

  const pendingOrders = orders
    .filter((o) => o.status === "new" || o.status === "preparing")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  const handleStartPrep = (orderId: string) => {
    setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: "preparing" } : o)))
  }

  const handleComplete = (orderId: string) => {
    setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: "completed" } : o)))
  }

  const getTimeElapsed = (createdAt: Date) => {
    const minutes = Math.floor((Date.now() - createdAt.getTime()) / 60000)
    return `${minutes}m`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-red-100 text-red-800 text-lg font-bold"
      case "preparing":
        return "bg-amber-100 text-amber-800 text-lg font-bold"
      case "completed":
        return "bg-green-100 text-green-800 text-lg font-bold"
      default:
        return ""
    }
  }

  return (
    <div className="w-full bg-gray-900 min-h-screen p-4">
      <div className="mb-6">
        <h1 className="text-white text-3xl font-bold mb-2">{t.kitchenScreen.title}</h1>
        <p className="text-gray-400">
          {pendingOrders.length} {t.kitchenScreen.pending}
        </p>
      </div>

      {pendingOrders.length === 0 ? (
        <div className="flex items-center justify-center min-h-96 bg-gray-800 text-white text-2xl font-semibold rounded">
          {t.kitchenScreen.noOrders}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingOrders.map((order) => (
            <Card key={order.id} className="bg-gray-800 border-2 border-gray-700 p-4 flex flex-col">
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Order Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-white text-2xl font-bold">{order.id}</p>
                    <p className="text-gray-400 text-sm">{getTimeElapsed(order.createdAt)} ago</p>
                  </div>
                  <Badge className={`${getStatusColor(order.status)} px-4 py-2`}>
                    {order.status === "new" ? "NEW" : order.status === "preparing" ? "PREPARING" : "DONE"}
                  </Badge>
                </div>

                {/* Items */}
                <div className="flex-1 mb-4 bg-gray-700 p-3 rounded">
                  <p className="text-white font-bold mb-3 text-lg">Items:</p>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="text-white">
                        <p className="text-xl font-bold">
                          {item.quantity}x {item.name}
                        </p>
                        {item.notes && <p className="text-yellow-300 text-sm mt-1">✦ {item.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {order.status === "new" && (
                    <Button
                      onClick={() => handleStartPrep(order.id)}
                      className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 text-lg"
                      aria-label={`Start preparing order ${order.id}`}
                    >
                      {t.kitchenScreen.startPrep}
                    </Button>
                  )}
                  {order.status === "preparing" && (
                    <Button
                      onClick={() => handleComplete(order.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 text-lg"
                      aria-label={`Mark order ${order.id} as complete`}
                    >
                      {t.kitchenScreen.markComplete}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
