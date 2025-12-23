"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const paymentMethods = [
  { name: "Cash on Delivery", enabled: true, icon: "💵" },
  { name: "ABA KHQR", enabled: true, icon: "📱" },
  { name: "Wing", enabled: false, icon: "📱" },
  { name: "PayWay", enabled: false, icon: "🏦" },
]

export function PaymentsPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Payment Methods</h1>
        <p className="text-muted-foreground mt-2">Configure payment gateway settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {paymentMethods.map((method) => (
          <Card key={method.name} className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-3xl">{method.icon}</span>
                <div>
                  <h3 className="font-semibold text-foreground">{method.name}</h3>
                  <p className="text-sm text-muted-foreground">Click to configure</p>
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked={method.enabled} className="w-4 h-4" />
                <span className="text-sm text-foreground">Enabled</span>
              </label>
            </div>
            {method.enabled && (
              <div className="mt-4 p-4 bg-muted/30 rounded border border-border">
                <p className="text-xs text-muted-foreground mb-2">Payment instructions or QR code would display here</p>
                <Button variant="outline" size="sm" className="text-xs bg-transparent">
                  Upload/Configure
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
