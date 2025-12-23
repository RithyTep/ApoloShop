"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useSettings, useUpdateSettings } from "@/lib/api-hooks"
import { useToast } from "@/components/ui/use-toast"

export function SettingsPage() {
  const { toast } = useToast()
  const { data, isLoading } = useSettings()
  const updateMutation = useUpdateSettings()

  const [shopInfo, setShopInfo] = useState({
    shopName: "",
    address: "",
    phone: "",
    facebookUrl: "",
    telegramUrl: "",
    instagramUrl: "",
  })

  const [currencySettings, setCurrencySettings] = useState({
    defaultCurrency: "USD",
    usdToKhrRate: 4100,
    enableKhr: true,
    enableUsd: true,
  })

  // Load settings when data is available
  useEffect(() => {
    if (data?.settings) {
      const s = data.settings
      setShopInfo({
        shopName: s.shopName || "",
        address: s.address || "",
        phone: s.phone || "",
        facebookUrl: s.socialLinks?.facebook || "",
        telegramUrl: s.socialLinks?.telegram || "",
        instagramUrl: s.socialLinks?.instagram || "",
      })
      setCurrencySettings({
        defaultCurrency: s.defaultCurrency || "USD",
        usdToKhrRate: s.exchangeRate || 4100,
        enableKhr: s.enableKhr ?? true,
        enableUsd: s.enableUsd ?? true,
      })
    }
  }, [data])

  const handleSaveShopInfo = async () => {
    try {
      await updateMutation.mutateAsync({
        shopName: shopInfo.shopName,
        address: shopInfo.address,
        phone: shopInfo.phone,
        socialLinks: {
          facebook: shopInfo.facebookUrl,
          telegram: shopInfo.telegramUrl,
          instagram: shopInfo.instagramUrl,
        },
      })
      toast({ title: "Shop information saved successfully" })
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const handleSaveCurrency = async () => {
    try {
      await updateMutation.mutateAsync({
        defaultCurrency: currencySettings.defaultCurrency,
        exchangeRate: currencySettings.usdToKhrRate,
        enableKhr: currencySettings.enableKhr,
        enableUsd: currencySettings.enableUsd,
      })
      toast({ title: "Currency settings saved successfully" })
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-2">Configure your shop settings</p>
        </div>
        <Card className="p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
        <Card className="p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">Configure your shop settings</p>
      </div>

      {/* Shop Info */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Shop Information</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="shopName">Shop Name</Label>
            <Input
              id="shopName"
              value={shopInfo.shopName}
              onChange={(e) => setShopInfo({ ...shopInfo, shopName: e.target.value })}
              className="border-border mt-1"
            />
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={shopInfo.address}
              onChange={(e) => setShopInfo({ ...shopInfo, address: e.target.value })}
              className="border-border mt-1"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={shopInfo.phone}
              onChange={(e) => setShopInfo({ ...shopInfo, phone: e.target.value })}
              className="border-border mt-1"
            />
          </div>
          <div>
            <Label>Social Links</Label>
            <div className="space-y-2 mt-1">
              <Input
                placeholder="Facebook URL"
                value={shopInfo.facebookUrl}
                onChange={(e) => setShopInfo({ ...shopInfo, facebookUrl: e.target.value })}
                className="border-border"
              />
              <Input
                placeholder="Telegram URL"
                value={shopInfo.telegramUrl}
                onChange={(e) => setShopInfo({ ...shopInfo, telegramUrl: e.target.value })}
                className="border-border"
              />
              <Input
                placeholder="Instagram URL"
                value={shopInfo.instagramUrl}
                onChange={(e) => setShopInfo({ ...shopInfo, instagramUrl: e.target.value })}
                className="border-border"
              />
            </div>
          </div>
          <Button
            onClick={handleSaveShopInfo}
            disabled={updateMutation.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </Card>

      {/* Currency Settings */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Currency Settings</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="defaultCurrency">Default Currency</Label>
            <select
              id="defaultCurrency"
              value={currencySettings.defaultCurrency}
              onChange={(e) => setCurrencySettings({ ...currencySettings, defaultCurrency: e.target.value })}
              className="w-full px-3 py-2 border border-border bg-background rounded mt-1"
            >
              <option value="USD">USD</option>
              <option value="KHR">KHR</option>
            </select>
          </div>
          <div>
            <Label htmlFor="exchangeRate">USD to KHR Rate</Label>
            <Input
              id="exchangeRate"
              type="number"
              value={currencySettings.usdToKhrRate}
              onChange={(e) => setCurrencySettings({ ...currencySettings, usdToKhrRate: parseInt(e.target.value) || 4100 })}
              className="border-border mt-1"
            />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={currencySettings.enableKhr}
                onChange={(e) => setCurrencySettings({ ...currencySettings, enableKhr: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm text-foreground">Enable KHR</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={currencySettings.enableUsd}
                onChange={(e) => setCurrencySettings({ ...currencySettings, enableUsd: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm text-foreground">Enable USD</span>
            </label>
          </div>
          <Button
            onClick={handleSaveCurrency}
            disabled={updateMutation.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </Card>
    </div>
  )
}
