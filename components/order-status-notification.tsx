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
    new: "bg-info/10 text-info",
    confirmed: "bg-warning/10 text-warning",
    preparing: "bg-accent/10 text-accent",
    completed: "bg-success/10 text-success",
    cancelled: "bg-destructive/10 text-destructive",
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
                      ? `border-primary ${statusColors[status]}`
                      : "border-border bg-muted text-muted-foreground"
                  }`}
                  type="button"
                  aria-label={`Status: ${t.orderStatus[status]}`}
                >
                  {index + 1}
                </button>
                {index < statusOrder.length - 1 && (
                  <div
                    className={`h-1 w-8 mx-1 ${
                      statusOrder.indexOf(currentStatus) > index ? "bg-primary" : "bg-border"
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
        <div className="bg-primary/5 p-4 border border-primary/20">
          <p className="text-sm text-muted-foreground mb-2">Current Status</p>
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
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            aria-label="Send via Telegram"
          >
            <MessageCircle className="w-4 h-4 mr-2" aria-hidden="true" />
            {t.orderNotification.telegramBtn}
          </Button>
          <Button
            onClick={handleSendUpdate}
            className="flex-1 bg-info hover:bg-info/90 text-info-foreground"
            aria-label="Send via Facebook Messenger"
          >
            <Mail className="w-4 h-4 mr-2" aria-hidden="true" />
            {t.orderNotification.messengerBtn}
          </Button>
        </div>

        {messageSent && (
          <div className="bg-success/10 text-success p-3 flex items-center gap-2 text-sm" role="status">
            <Check className="w-4 h-4" aria-hidden="true" />
            {t.orderNotification.updateSent}
          </div>
        )}

        <Button onClick={handleSendUpdate} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
          {t.orderNotification.sendUpdate}
        </Button>
      </CardContent>
    </Card>
  )
}
