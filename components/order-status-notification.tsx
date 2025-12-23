"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { MessageCircle, Mail, Check } from "lucide-react"
import { translations, type Language } from "@/lib/i18n"

type OrderStatusType = "new" | "confirmed" | "preparing" | "completed" | "cancelled"

interface OrderStatusNotificationProps {
  language?: Language
}

export function OrderStatusNotification({ language = "en" }: OrderStatusNotificationProps) {
  const [currentStatus, setCurrentStatus] = useState<OrderStatusType>("new")
  const [customMessage, setCustomMessage] = useState("")
  const [messageSent, setMessageSent] = useState(false)
  const t = translations[language]

  const statusColors: Record<OrderStatusType, string> = {
    new: "bg-blue-100 text-blue-800",
    confirmed: "bg-amber-100 text-amber-800",
    preparing: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  }

  const statusOrder: OrderStatusType[] = ["new", "confirmed", "preparing", "completed"]

  const handleStatusChange = (status: OrderStatusType) => {
    setCurrentStatus(status)
    setMessageSent(false)
  }

  const handleSendUpdate = () => {
    setMessageSent(true)
    setTimeout(() => setMessageSent(false), 3000)
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{t.orderNotification.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Timeline */}
        <div>
          <h3 className="text-sm font-semibold mb-4">Order Timeline</h3>
          <div className="flex items-center gap-2">
            {statusOrder.map((status, index) => (
              <div key={status} className="flex items-center">
                <button
                  onClick={() => handleStatusChange(status)}
                  className={`w-12 h-12 border-2 flex items-center justify-center font-bold text-sm cursor-pointer transition-all ${
                    currentStatus === status || statusOrder.indexOf(currentStatus) >= index
                      ? `border-pink-500 ${statusColors[status]}`
                      : "border-gray-300 bg-gray-100 text-gray-500"
                  }`}
                  type="button"
                  aria-label={`Status: ${t.orderStatus[status]}`}
                >
                  {index + 1}
                </button>
                {index < statusOrder.length - 1 && (
                  <div
                    className={`h-1 w-8 mx-1 ${
                      statusOrder.indexOf(currentStatus) > index ? "bg-pink-500" : "bg-gray-300"
                    }`}
                    aria-hidden="true"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            {statusOrder.map((status) => (
              <div key={status} className="text-xs text-center flex-1">
                <Badge className={statusColors[status]}>{t.orderStatus[status]}</Badge>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Current Status Display */}
        <div className="bg-pink-50 p-4 border border-pink-200">
          <p className="text-sm text-gray-600 mb-2">Current Status</p>
          <Badge className={`${statusColors[currentStatus]} text-lg px-4 py-2`}>{t.orderStatus[currentStatus]}</Badge>
        </div>

        {/* Custom Message */}
        <div>
          <label htmlFor="custom-message" className="text-sm font-semibold mb-2 block">
            {t.orderNotification.messagePlaceholder}
          </label>
          <Textarea
            id="custom-message"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder={t.orderNotification.messagePlaceholder}
            className="min-h-24"
          />
        </div>

        {/* Send Update Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleSendUpdate}
            className="flex-1 bg-pink-600 hover:bg-pink-700 text-white"
            aria-label="Send via Telegram"
          >
            <MessageCircle className="w-4 h-4 mr-2" aria-hidden="true" />
            {t.orderNotification.telegramBtn}
          </Button>
          <Button
            onClick={handleSendUpdate}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            aria-label="Send via Facebook Messenger"
          >
            <Mail className="w-4 h-4 mr-2" aria-hidden="true" />
            {t.orderNotification.messengerBtn}
          </Button>
        </div>

        {messageSent && (
          <div className="bg-green-100 text-green-800 p-3 flex items-center gap-2 text-sm" role="status">
            <Check className="w-4 h-4" aria-hidden="true" />
            {t.orderNotification.updateSent}
          </div>
        )}

        <Button onClick={handleSendUpdate} className="w-full bg-pink-500 hover:bg-pink-600 text-white">
          {t.orderNotification.sendUpdate}
        </Button>
      </CardContent>
    </Card>
  )
}
