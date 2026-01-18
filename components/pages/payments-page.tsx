"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { useSettings, useUpdateSettings } from "@/lib/api-hooks"
import { useToast } from "@/components/ui/use-toast"
import { AdminPageHeader, AdminLoading } from "@/components/admin"

interface PaymentMethod {
  id: string
  name: string
  icon: string
  enabled: boolean
  config?: Record<string, string>
}

const defaultPaymentMethods: PaymentMethod[] = [
  { id: "cash", name: "Cash on Delivery", icon: "💵", enabled: true },
  { id: "aba_khqr", name: "ABA KHQR", icon: "📱", enabled: false, config: { qrImageUrl: "" } },
  { id: "wing", name: "Wing", icon: "📱", enabled: false, config: { accountNumber: "" } },
  { id: "payway", name: "PayWay", icon: "🏦", enabled: false, config: { merchantId: "", apiKey: "" } },
]

export function PaymentsPage() {
  const { toast } = useToast()
  const { data, isLoading } = useSettings()
  const updateMutation = useUpdateSettings()

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(defaultPaymentMethods)
  const [configureMethod, setConfigureMethod] = useState<PaymentMethod | null>(null)
  const [configData, setConfigData] = useState<Record<string, string>>({})

  // Load settings when data is available
  useEffect(() => {
    if (data?.settings?.paymentMethods) {
      const savedMethods = data.settings.paymentMethods as PaymentMethod[]
      // Merge with defaults to ensure all methods are present
      const merged = defaultPaymentMethods.map((def) => {
        const saved = savedMethods.find((m) => m.id === def.id)
        return saved ? { ...def, ...saved } : def
      })
      setPaymentMethods(merged)
    }
  }, [data])

  const handleToggle = async (methodId: string) => {
    const updated = paymentMethods.map((m) =>
      m.id === methodId ? { ...m, enabled: !m.enabled } : m
    )
    setPaymentMethods(updated)

    try {
      await updateMutation.mutateAsync({ paymentMethods: updated })
      toast({ title: "Payment method updated" })
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
      // Revert on error
      setPaymentMethods(paymentMethods)
    }
  }

  const openConfigDialog = (method: PaymentMethod) => {
    setConfigureMethod(method)
    setConfigData(method.config || {})
  }

  const handleSaveConfig = async () => {
    if (!configureMethod) return

    const updated = paymentMethods.map((m) =>
      m.id === configureMethod.id ? { ...m, config: configData, enabled: true } : m
    )
    setPaymentMethods(updated)

    try {
      await updateMutation.mutateAsync({ paymentMethods: updated })
      toast({ title: "Payment configuration saved" })
      setConfigureMethod(null)
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const getConfigFields = (methodId: string): { key: string; label: string; type?: string }[] => {
    switch (methodId) {
      case "aba_khqr":
        return [
          { key: "qrImageUrl", label: "QR Code Image URL" },
          { key: "accountName", label: "Account Name" },
        ]
      case "wing":
        return [
          { key: "accountNumber", label: "Account Number" },
          { key: "accountName", label: "Account Name" },
        ]
      case "payway":
        return [
          { key: "merchantId", label: "Merchant ID" },
          { key: "apiKey", label: "API Key", type: "password" },
        ]
      default:
        return []
    }
  }

  if (isLoading) {
    return (
      <AdminLoading
        title="Payment Methods"
        subtitle="Configure payment gateway settings"
        rows={4}
      />
    )
  }

  return (
    <div className="p-8 space-y-6">
      <AdminPageHeader
        title="Payment Methods"
        subtitle="Configure payment gateway settings"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {paymentMethods.map((method) => {
          const configFields = getConfigFields(method.id)
          const hasConfig = configFields.length > 0

          return (
            <Card key={method.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{method.icon}</span>
                  <div>
                    <h3 className="font-semibold text-foreground">{method.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {hasConfig ? "Click Configure to set up" : "Ready to use"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={method.enabled}
                    onCheckedChange={() => handleToggle(method.id)}
                    disabled={updateMutation.isPending}
                  />
                  <span className="text-sm text-foreground">Enabled</span>
                </div>
              </div>
              {hasConfig && (
                <div className="mt-4 p-4 bg-muted/30 rounded border border-border">
                  {method.enabled && method.config?.qrImageUrl && (
                    <div className="mb-2">
                      <p className="text-xs text-muted-foreground">QR Code configured</p>
                    </div>
                  )}
                  {method.enabled && method.config?.accountNumber && (
                    <div className="mb-2">
                      <p className="text-xs text-muted-foreground">Account: {method.config.accountNumber}</p>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs bg-transparent"
                    onClick={() => openConfigDialog(method)}
                  >
                    Configure
                  </Button>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Configuration Dialog */}
      <Dialog open={!!configureMethod} onOpenChange={() => setConfigureMethod(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Configure {configureMethod?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {configureMethod && getConfigFields(configureMethod.id).map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type={field.type || "text"}
                  value={configData[field.key] || ""}
                  onChange={(e) => setConfigData({ ...configData, [field.key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigureMethod(null)}>Cancel</Button>
            <Button
              onClick={handleSaveConfig}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
